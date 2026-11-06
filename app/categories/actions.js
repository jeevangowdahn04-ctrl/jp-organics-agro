"use server";

import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_TYPES, MEDIA_BUCKET, storagePathFromUrl } from "@/lib/media";
import { isCategorySlug } from "@/lib/categories";

// ವರ್ಗಗಳ ಲೋಗೋ: admin_settings ಟೇಬಲ್‌ನ "category_images" ಸಾಲಿನಲ್ಲಿ JSON ಆಗಿ ({ slug: url }).
// ಓದುವುದು ಎಲ್ಲರಿಗೂ (ಈ ಒಂದು ಸಾಲು ಮಾತ್ರ), ಬದಲಾಯಿಸುವುದು ಅಡ್ಮಿನ್‌ಗೆ ಮಾತ್ರ.

const KEY = "category_images";
const PREFIX = "categories/";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function cleanUrl(value) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length > 1000) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

async function readImages(sb) {
  const { data, error } = await sb.from("admin_settings").select("value").eq("key", KEY).maybeSingle();
  if (error || !data?.value) return {};
  try {
    const parsed = JSON.parse(data.value);
    const out = {};
    for (const [slug, url] of Object.entries(parsed || {})) {
      const clean = cleanUrl(url);
      if (isCategorySlug(slug) && clean) out[slug] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getCategoryImages() {
  const sb = getSupabaseAdmin();
  if (!sb) return {};
  return readImages(sb);
}

// ಲೋಗೋ ಉಳಿಸುವುದು (url = ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಫೋಟೋ ಅಥವಾ ಹೊರಗಿನ https ಇಮೇಜ್ ಲಿಂಕ್) ಅಥವಾ ತೆಗೆಯುವುದು (url = null)
export async function setCategoryImage(slug, url) {
  if (!(await isAdmin())) return { error: "auth" };
  if (!isCategorySlug(slug)) return { error: "invalid" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };

  let next = null;
  if (url !== null) {
    next = cleanUrl(url);
    if (!next) return { error: "url" };
  }

  const images = await readImages(sb);
  const old = images[slug];
  if (next) images[slug] = next;
  else delete images[slug];

  const { error } = await sb
    .from("admin_settings")
    .upsert({ key: KEY, value: JSON.stringify(images), updated_at: new Date().toISOString() });
  if (error) return { error: "server" };

  // ನಾವೇ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಹಳೆಯ ಲೋಗೋ ಫೈಲ್ ಅಳಿಸುವುದು
  const oldPath = storagePathFromUrl(old);
  if (oldPath?.startsWith(PREFIX) && old !== next) await sb.storage.from(MEDIA_BUCKET).remove([oldPath]);
  return { ok: true, images };
}

export async function createCategoryUploadUrl(slug, { contentType, size }) {
  if (!(await isAdmin())) return { error: "auth" };
  if (!isCategorySlug(slug)) return { error: "invalid" };
  if (!IMAGE_TYPES.includes(contentType)) return { error: "type" };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_LOGO_BYTES) return { error: "size" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const path = `${PREFIX}${slug}-${Date.now()}.${ext}`;
  const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "server" };
  return { path, token: data.token, publicUrl: sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}
