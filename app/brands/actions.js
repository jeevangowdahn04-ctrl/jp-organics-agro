"use server";

import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_TYPES, MEDIA_BUCKET, storagePathFromUrl } from "@/lib/media";

// ಬ್ರಾಂಡ್ ನಿರ್ವಹಣೆ (ಅಡ್ಮಿನ್ ಮಾತ್ರ). ಓದುವುದು ಬ್ರೌಸರ್‌ನಿಂದ ನೇರವಾಗಿ (brands ಟೇಬಲ್‌ಗೆ public read RLS).

const PREFIX = "brands/";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function cleanName(v) {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

function cleanLogo(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || v.length > 1000) return undefined;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function dbError(error) {
  if (error.code === "23505") return { error: "duplicate" };
  if (error.code === "42P01" || error.code === "PGRST205") return { error: "table" };
  console.error("brands:", error.message);
  return { error: "server" };
}

async function removeOurLogo(sb, url) {
  const path = storagePathFromUrl(url);
  if (path?.startsWith(PREFIX)) await sb.storage.from(MEDIA_BUCKET).remove([path]);
}

export async function createBrandUploadUrl({ contentType, size }) {
  if (!(await isAdmin())) return { error: "auth" };
  if (!IMAGE_TYPES.includes(contentType)) return { error: "type" };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_LOGO_BYTES) return { error: "size" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const path = `${PREFIX}${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "server" };
  return { path, token: data.token, publicUrl: sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function saveBrand({ id, name, logoUrl }) {
  if (!(await isAdmin())) return { error: "auth" };
  const clean = cleanName(name);
  if (!clean) return { error: "name" };
  const logo = cleanLogo(logoUrl);
  if (logo === undefined) return { error: "url" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };

  if (id) {
    const { data: old, error: readErr } = await sb.from("brands").select("logo_url").eq("id", id).maybeSingle();
    if (readErr) return dbError(readErr);
    if (!old) return { error: "missing" };
    const { error } = await sb.from("brands").update({ name: clean, logo_url: logo }).eq("id", id);
    if (error) return dbError(error);
    if (old.logo_url && old.logo_url !== logo) await removeOurLogo(sb, old.logo_url);
    return { ok: true };
  }
  const { data: created, error } = await sb.from("brands").insert([{ name: clean, logo_url: logo }]).select("id").single();
  if (error) {
    // ಉಳಿಸಲು ಆಗದಿದ್ದರೆ ಈಗಷ್ಟೇ ಅಪ್‌ಲೋಡ್ ಆದ ಲೋಗೋ ಬೇಡ
    if (logo) await removeOurLogo(sb, logo);
    return dbError(error);
  }
  return { ok: true, id: created.id };
}

// ಬ್ರಾಂಡ್ ಅಳಿಸುವುದು: ಅದರ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಉಳಿಯುತ್ತವೆ (brand_id ಖಾಲಿಯಾಗುತ್ತದೆ), ನಮ್ಮ ಲೋಗೋ ಫೈಲ್ ಅಳಿಸುತ್ತದೆ
export async function deleteBrand(id) {
  if (!(await isAdmin())) return { error: "auth" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const { data: old } = await sb.from("brands").select("logo_url").eq("id", id).maybeSingle();
  const { error } = await sb.from("brands").delete().eq("id", id);
  if (error) return dbError(error);
  if (old?.logo_url) await removeOurLogo(sb, old.logo_url);
  return { ok: true };
}

// ಅಪ್‌ಲೋಡ್ ಆದ ಲೋಗೋವನ್ನು ಉಳಿಸದೇ ಬಿಟ್ಟರೆ (ಫಾರ್ಮ್ ರದ್ದು) ಅದನ್ನು ಅಳಿಸುವುದು
export async function discardBrandLogo(url) {
  if (!(await isAdmin())) return { error: "auth" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const path = storagePathFromUrl(url);
  if (!path?.startsWith(PREFIX)) return { ok: true };
  const { count } = await sb.from("brands").select("id", { count: "exact", head: true }).eq("logo_url", url);
  if (!count) await sb.storage.from(MEDIA_BUCKET).remove([path]);
  return { ok: true };
}
