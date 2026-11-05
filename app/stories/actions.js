"use server";

import { headers } from "next/headers";
import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_TYPES, MEDIA_BUCKET, VIDEO_TYPES, isOurStorageUrl, storagePathFromUrl } from "@/lib/media";

// ರೈತರ ಅನುಭವ (Farmer Stories): ಯಾರು ಬೇಕಾದರೂ ಕಳುಹಿಸಬಹುದು, ಅಡ್ಮಿನ್ ಅನುಮೋದನೆಯ ನಂತರವೇ ಪ್ರಕಟ.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const STORY_PREFIX = "stories/";

const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+\n/g, "\n").slice(0, max) : "");

// ಒಂದೇ ಸಾಧನದಿಂದ ಅತಿ ಹೆಚ್ಚು ಕಳುಹಿಸುವುದನ್ನು ತಡೆಯಲು ಸರಳ ಮಿತಿ (ಸರ್ವರ್ ನಿದರ್ಶನದ ಮೆಮೊರಿಯಲ್ಲಿ)
const recent = new Map();
async function rateLimited(kind, limit, windowMs) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return true;
  hits.push(now);
  recent.set(key, hits);
  return false;
}

// ಫೋಟೋ/ವಿಡಿಯೋ ನೇರವಾಗಿ Storage ಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಒಂದು ಬಾರಿಯ signed URL (ಸಾರ್ವಜನಿಕರಿಗೆ, ಮಿತಿಗಳೊಂದಿಗೆ)
export async function createStoryUploadUrl({ contentType, size }) {
  const kind = IMAGE_TYPES.includes(contentType) ? "image" : VIDEO_TYPES.includes(contentType) ? "video" : null;
  if (!kind) return { error: "type" };
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) return { error: "size" };
  if (await rateLimited("upload", 10, 60 * 60 * 1000)) return { error: "rate" };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "server" };

  const ext = contentType.split("/")[1].replace("quicktime", "mov").replace("jpeg", "jpg");
  const path = `${STORY_PREFIX}${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "server" };
  const { data: pub } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl, mediaType: kind };
}

export async function submitStory({ farmerName, village, product, crop, note, mediaUrl, mediaType, website }) {
  // website = ಮಾನವರಿಗೆ ಕಾಣದ honeypot ಫೀಲ್ಡ್; ತುಂಬಿದ್ದರೆ ಬಾಟ್
  if (website) return { ok: true };

  const row = {
    farmer_name: text(farmerName, 60),
    village: text(village, 80) || null,
    product: text(product, 80) || null,
    crop: text(crop, 60) || null,
    note: text(note, 1000),
    media_url: null,
    media_type: null,
    status: "pending",
  };
  if (row.farmer_name.length < 2) return { error: "name" };
  if (row.note.length < 10) return { error: "note" };

  const cleanUrl = typeof mediaUrl === "string" ? mediaUrl.trim() : "";
  if (cleanUrl) {
    const path = storagePathFromUrl(cleanUrl);
    if (!isOurStorageUrl(cleanUrl) || !path?.startsWith(STORY_PREFIX) || !["image", "video"].includes(mediaType)) {
      return { error: "media" };
    }
    row.media_url = cleanUrl;
    row.media_type = mediaType;
  }

  if (await rateLimited("story", 5, 60 * 60 * 1000)) return { error: "rate" };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "server" };
  const { error } = await supabaseAdmin.from("farmer_stories").insert([row]);
  if (error) {
    console.error("submitStory failed:", error.message);
    return { error: error.code === "42P01" || error.code === "PGRST205" ? "table" : "server" };
  }
  return { ok: true };
}

// ---- ಅಡ್ಮಿನ್ ----

export async function listPendingStories() {
  if (!(await isAdmin())) return { error: "auth" };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "server" };
  const { data, error } = await supabaseAdmin
    .from("farmer_stories")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return { error: "server" };
  return { stories: data };
}

export async function approveStory(id) {
  if (!(await isAdmin())) return { error: "auth" };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "server" };
  const { error } = await supabaseAdmin.from("farmer_stories").update({ status: "approved" }).eq("id", id);
  return error ? { error: "server" } : { ok: true };
}

// ಅಳಿಸುವುದು (ಅನುಮೋದನೆ ಬಾಕಿ ಇರುವುದು ಅಥವಾ ಪ್ರಕಟವಾದದ್ದು), ಅದರ ಫೋಟೋ/ವಿಡಿಯೋ ಕೂಡ
export async function deleteStory(id) {
  if (!(await isAdmin())) return { error: "auth" };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "server" };
  const { data: story } = await supabaseAdmin.from("farmer_stories").select("media_url").eq("id", id).maybeSingle();
  const { error } = await supabaseAdmin.from("farmer_stories").delete().eq("id", id);
  if (error) return { error: "server" };
  const path = storagePathFromUrl(story?.media_url);
  if (path?.startsWith(STORY_PREFIX)) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([path]);
  return { ok: true };
}
