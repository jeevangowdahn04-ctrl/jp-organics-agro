"use server";

import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_TYPES, MEDIA_BUCKET, storagePathFromUrl } from "@/lib/media";
import { isCategorySlug } from "@/lib/categories";

// ಉಪವರ್ಗ ನಿರ್ವಹಣೆ (ಅಡ್ಮಿನ್ ಮಾತ್ರ). ಓದುವುದು ಬ್ರೌಸರ್‌ನಿಂದ ನೇರವಾಗಿ (public read RLS).

const PREFIX = "subcategories/";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const cleanName = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 80) : "");

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
  console.error("subcategories:", error.message);
  return { error: "server" };
}

async function removeOurLogo(sb, url) {
  const path = storagePathFromUrl(url);
  if (path?.startsWith(PREFIX)) await sb.storage.from(MEDIA_BUCKET).remove([path]);
}

export async function createSubcategoryUploadUrl({ contentType, size }) {
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

// ಹೊಸ ಉಪವರ್ಗ ಅಥವಾ ಎಡಿಟ್ (id ಇದ್ದರೆ). ವರ್ಗ ಬದಲಾಯಿಸಲು ಅವಕಾಶವಿಲ್ಲ (ಪ್ರಾಡಕ್ಟ್‌ಗಳ ಹೊಂದಿಕೆ ತಪ್ಪದಂತೆ).
export async function saveSubcategory({ id, categorySlug, name, nameEn, logoUrl }) {
  if (!(await isAdmin())) return { error: "auth" };
  const clean = cleanName(name);
  const cleanEn = cleanName(nameEn) || null;
  if (!clean) return { error: "name" };
  const logo = cleanLogo(logoUrl);
  if (logo === undefined) return { error: "url" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };

  if (id) {
    const { data: old, error: readErr } = await sb.from("subcategories").select("logo_url").eq("id", id).maybeSingle();
    if (readErr) return dbError(readErr);
    if (!old) return { error: "missing" };
    const { error } = await sb.from("subcategories").update({ name: clean, name_en: cleanEn, logo_url: logo }).eq("id", id);
    if (error) return dbError(error);
    if (old.logo_url && old.logo_url !== logo) await removeOurLogo(sb, old.logo_url);
    return { ok: true };
  }
  if (!isCategorySlug(categorySlug) || categorySlug === "brands") return { error: "category" };
  const { error } = await sb.from("subcategories").insert([{ category_slug: categorySlug, name: clean, name_en: cleanEn, logo_url: logo }]);
  if (error) {
    if (logo) await removeOurLogo(sb, logo);
    return dbError(error);
  }
  return { ok: true };
}

// ಅಳಿಸಿದರೆ ಅದರ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಉಳಿಯುತ್ತವೆ (subcategory_id ಖಾಲಿ), ನಮ್ಮ ಲೋಗೋ ಫೈಲ್ ಅಳಿಸುತ್ತದೆ
export async function deleteSubcategory(id) {
  if (!(await isAdmin())) return { error: "auth" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const { data: old } = await sb.from("subcategories").select("logo_url").eq("id", id).maybeSingle();
  const { error } = await sb.from("subcategories").delete().eq("id", id);
  if (error) return dbError(error);
  if (old?.logo_url) await removeOurLogo(sb, old.logo_url);
  return { ok: true };
}

export async function discardSubcategoryLogo(url) {
  if (!(await isAdmin())) return { error: "auth" };
  const sb = getSupabaseAdmin();
  if (!sb) return { error: "server" };
  const path = storagePathFromUrl(url);
  if (!path?.startsWith(PREFIX)) return { ok: true };
  const { count } = await sb.from("subcategories").select("id", { count: "exact", head: true }).eq("logo_url", url);
  if (!count) await sb.storage.from(MEDIA_BUCKET).remove([path]);
  return { ok: true };
}
