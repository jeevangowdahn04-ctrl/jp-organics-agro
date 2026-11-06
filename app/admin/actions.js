"use server";

import { categoryOf } from "@/lib/categories";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  checkPassword,
  checkRecoveryPin,
  isAdmin,
  saveAdminPassword,
  sessionToken,
} from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clearFailures, lockedMinutes, recordFailure } from "@/lib/loginGuard";
import {
  IMAGE_TYPES,
  MAX_IMAGES,
  MEDIA_BUCKET,
  VIDEO_TYPES,
  getProductImages,
  getYouTubeId,
  isOurStorageUrl,
  storagePathFromUrl,
} from "@/lib/media";
import { highlightLines } from "@/lib/pricing";

// ಅಡ್ಮಿನ್ ಕುಕೀ ಇಡೀ ಸೈಟ್‌ಗೆ (path "/"), ಮುಖಪುಟದ ಇನ್‌ಲೈನ್ ಅಡ್ಮಿನ್ ಮೋಡ್ ಕೂಡ ಇದನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ
async function startAdminSession() {
  const jar = await cookies();
  jar.delete({ name: ADMIN_COOKIE, path: "/admin" }); // ಹಳೆಯ /admin-ಮಾತ್ರ ಕುಕೀ ಇದ್ದರೆ ತೆಗೆಯುವುದು
  jar.set(ADMIN_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 ಗಂಟೆ
  });
}

async function endAdminSession() {
  const jar = await cookies();
  jar.delete({ name: ADMIN_COOKIE, path: "/" });
  jar.delete({ name: ADMIN_COOKIE, path: "/admin" });
}

const lockedText = (m) => `ತುಂಬಾ ಬಾರಿ ತಪ್ಪು ಪ್ರಯತ್ನ. ಸುರಕ್ಷತೆಗಾಗಿ ${m} ನಿಮಿಷ ತಡೆಹಿಡಿಯಲಾಗಿದೆ, ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.`;

// ಪಾಸ್‌ವರ್ಡ್ ಪರಿಶೀಲನೆ + ಊಹೆ ತಡೆ (5 ತಪ್ಪು ಪ್ರಯತ್ನ → 15 ನಿಮಿಷ ಲಾಕ್; ಲಾಕ್ ಇರುವಾಗ ಸರಿಯಾದ ಪಾಸ್‌ವರ್ಡ್ ಕೂಡ ಬೇಡ)
// ಫಲಿತಾಂಶ: { ok } | { locked: ನಿಮಿಷ } | { wrong: true, remaining }
async function guardedPasswordCheck(password) {
  const locked = await lockedMinutes("login");
  if (locked) return { locked };
  // ಊಹಿಸಿ ಪ್ರಯತ್ನಿಸುವುದನ್ನು ನಿಧಾನಗೊಳಿಸಲು ಸಣ್ಣ ವಿರಾಮ
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (await checkPassword(password)) {
    await clearFailures("login");
    return { ok: true };
  }
  const result = await recordFailure("login");
  return result.lockedMinutes ? { locked: result.lockedMinutes } : { wrong: true, remaining: result.remaining };
}

export async function login(prevState, formData) {
  const check = await guardedPasswordCheck(formData.get("password"));
  if (check.locked) return { error: lockedText(check.locked) };
  if (!check.ok) return { error: `ತಪ್ಪು ಪಾಸ್‌ವರ್ಡ್. ಇನ್ನು ${check.remaining} ಪ್ರಯತ್ನ ಬಾಕಿ.` };
  await startAdminSession();
  redirect("/admin");
}

// ಮುಖಪುಟ/ಪ್ರೊಫೈಲ್‌ನಿಂದ ಅಡ್ಮಿನ್ ಲಾಗಿನ್ (redirect ಇಲ್ಲ, ಫಲಿತಾಂಶ ಮಾತ್ರ)
export async function adminLoginInline(prevState, formData) {
  const check = await guardedPasswordCheck(formData.get("password"));
  if (check.locked) return { error: "locked", minutes: check.locked };
  if (!check.ok) return { error: "wrong", remaining: check.remaining };
  await startAdminSession();
  return { ok: true };
}

export async function adminLogoutInline() {
  await endAdminSession();
  return { ok: true };
}

// ಕ್ಲೈಂಟ್ UI ಗೆ ಮಾತ್ರ: ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್‌ಗಳನ್ನು ತೋರಿಸಬೇಕೆ? (ಪ್ರತಿ ಬದಲಾವಣೆಯನ್ನು ಸರ್ವರ್ ಮತ್ತೆ isAdmin ನಿಂದ ಪರಿಶೀಲಿಸುತ್ತದೆ)
export async function adminStatus() {
  return { isAdmin: await isAdmin() };
}

export async function logout() {
  await endAdminSession();
  redirect("/admin");
}

// RECOVERY_PIN ಸರಿಯಿದ್ದರೆ ಹೊಸ ಅಡ್ಮಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಮಾಡುವುದು
export async function resetPassword(prevState, formData) {
  // ಊಹಿಸಿ ಪ್ರಯತ್ನಿಸುವುದನ್ನು ನಿಧಾನಗೊಳಿಸಲು ಸಣ್ಣ ವಿರಾಮ
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!process.env.RECOVERY_PIN) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ RECOVERY_PIN ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }
  // Recovery PIN ಊಹೆ ತಡೆ: 5 ತಪ್ಪು ಪ್ರಯತ್ನ → 1 ಗಂಟೆ ಲಾಕ್
  const pinLocked = await lockedMinutes("pin");
  if (pinLocked) return { error: lockedText(pinLocked) };
  if (!checkRecoveryPin(formData.get("pin"))) {
    const result = await recordFailure("pin");
    if (result.lockedMinutes) return { error: lockedText(result.lockedMinutes) };
    return { error: `ತಪ್ಪು Recovery PIN. ಇನ್ನು ${result.remaining} ಪ್ರಯತ್ನ ಬಾಕಿ.` };
  }
  await clearFailures("pin");

  const newPassword = formData.get("newPassword");
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { error: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳಿರಬೇಕು." };
  }
  if (newPassword !== formData.get("confirmPassword")) {
    return { error: "ಎರಡೂ ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತಿಲ್ಲ." };
  }

  const result = await saveAdminPassword(newPassword);
  if (result.error) return { error: result.error };
  return { ok: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಆಗಿದೆ. ಈಗ ಅದರಿಂದ ಲಾಗಿನ್ ಮಾಡಿ." };
}

const SESSION_EXPIRED = { error: "ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ." };
const NO_SERVICE_KEY = { error: "ಸರ್ವರ್‌ನಲ್ಲಿ SUPABASE_SERVICE_ROLE_KEY ಸೆಟ್ ಆಗಿಲ್ಲ." };

// ಫಾರ್ಮ್‌ನಿಂದ ಬಂದ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ ಡೇಟಾಬೇಸ್ ರೋ ತಯಾರಿಸುವುದು
const cleanText = (value, max = 5000) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function buildProductRow({
  name, nameEn, price, mrp, category, categoryEn, weight, description, descriptionEn, highlights, highlightsEn, inStock, imageUrls, videoUrl, brandId, subcategoryId,
}) {
  // ಕನ್ನಡ ಹೆಸರು ಅಥವಾ English ಹೆಸರು, ಕನಿಷ್ಠ ಒಂದು ಬೇಕು (name ಕಾಲಂ ಖಾಲಿ ಇರಬಾರದು, ಹಾಗಾಗಿ ಕನ್ನಡ ಇಲ್ಲದಿದ್ದರೆ English ಹೆಸರೇ ಅಲ್ಲಿ)
  const cleanNameEn = cleanText(nameEn, 200);
  const cleanName = cleanText(name, 200) || cleanNameEn;
  const cleanPrice = Number(price);
  if (!cleanName || !Number.isFinite(cleanPrice) || cleanPrice < 0) {
    return { error: "ಕನ್ನಡ ಅಥವಾ English ಹೆಸರು ಮತ್ತು ಸರಿಯಾದ ಆಫರ್ ಬೆಲೆ ನಮೂದಿಸಿ." };
  }

  // MRP ಐಚ್ಛಿಕ; ಕೊಟ್ಟರೆ ಆಫರ್ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ ಇರಬಾರದು
  const hasMrp = mrp !== "" && mrp !== null && mrp !== undefined;
  const cleanMrp = hasMrp ? Number(mrp) : null;
  if (hasMrp && (!Number.isFinite(cleanMrp) || cleanMrp < 0)) {
    return { error: "ಸರಿಯಾದ MRP ನಮೂದಿಸಿ." };
  }
  if (hasMrp && cleanMrp < cleanPrice) {
    return { error: "MRP (ಮೂಲ ಬೆಲೆ) ಆಫರ್ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ ಇರಬಾರದು." };
  }

  const images = Array.isArray(imageUrls) ? imageUrls.map((u) => String(u).trim()).filter(Boolean) : [];
  if (images.length > MAX_IMAGES) {
    return { error: `ಗರಿಷ್ಠ ${MAX_IMAGES} ಫೋಟೋಗಳನ್ನು ಮಾತ್ರ ಸೇರಿಸಬಹುದು.` };
  }
  if (images.some((u) => !isOurStorageUrl(u))) {
    return { error: "ಫೋಟೋ URL ಸರಿಯಿಲ್ಲ." };
  }

  const cleanVideo = typeof videoUrl === "string" ? videoUrl.trim() : "";
  if (cleanVideo && !isOurStorageUrl(cleanVideo) && !getYouTubeId(cleanVideo)) {
    return { error: "ವಿಡಿಯೋ: ಸರಿಯಾದ YouTube ಲಿಂಕ್ ಹಾಕಿ ಅಥವಾ ವಿಡಿಯೋ ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ." };
  }

  // ಬ್ರಾಂಡ್ (ಐಚ್ಛಿಕ): ಬ್ರಾಂಡ್ ಪಟ್ಟಿಯ id ಅಥವಾ ಖಾಲಿ
  const cleanBrand = brandId === "" || brandId === null || brandId === undefined ? null : Number(brandId);
  if (cleanBrand !== null && (!Number.isInteger(cleanBrand) || cleanBrand <= 0)) {
    return { error: "ಬ್ರಾಂಡ್ ಸರಿಯಿಲ್ಲ." };
  }

  // ಉಪವರ್ಗ (ಐಚ್ಛಿಕ): ವರ್ಗಕ್ಕೆ ಹೊಂದುತ್ತದೆಯೇ ಎಂದು ಸೇವ್ ಮಾಡುವಾಗ ಪರಿಶೀಲನೆ (checkSubcategory)
  const cleanSub = subcategoryId === "" || subcategoryId === null || subcategoryId === undefined ? null : Number(subcategoryId);
  if (cleanSub !== null && (!Number.isInteger(cleanSub) || cleanSub <= 0)) {
    return { error: "ಉಪವರ್ಗ ಸರಿಯಿಲ್ಲ." };
  }

  return {
    row: {
      name: cleanName,
      brand_id: cleanBrand,
      subcategory_id: cleanSub,
      name_en: cleanNameEn || null,
      price: cleanPrice,
      mrp: cleanMrp,
      category: cleanText(category, 100) || null,
      category_en: cleanText(categoryEn, 100) || null,
      weight: cleanText(weight, 100) || null,
      description: cleanText(description),
      description_en: cleanText(descriptionEn) || null,
      // ಸಾಲುಗಳ array: jsonb ಕಾಲಂಗೆ ನೇರವಾಗಿ, text ಕಾಲಂಗೆ JSON ಪಠ್ಯವಾಗಿ ಉಳಿಯುತ್ತದೆ; ಓದುವಾಗ ಎರಡನ್ನೂ highlightLines ಸರಿಯಾಗಿ ಓದುತ್ತದೆ
      highlights: highlightLines(cleanText(highlights)),
      highlights_en: highlightLines(cleanText(highlightsEn)),
      in_stock: inStock !== false,
      image_url: images[0] ?? null,
      image_urls: images,
      video_url: cleanVideo || null,
    },
  };
}

function dbError(error) {
  if (error.code === "23503") return { error: "ಆಯ್ಕೆ ಮಾಡಿದ ಬ್ರಾಂಡ್ ಇನ್ನು ಇಲ್ಲ. ಪಟ್ಟಿಯನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ." };
  if (error.code === "42703" || error.code === "PGRST204") {
    return { error: "ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಬೇಕಾದ ಕಾಲಂ ಇಲ್ಲ (brand_id / subcategory_id / *_en). supabase/subcategories.sql, brands.sql ಮತ್ತು product-bilingual.sql ರನ್ ಮಾಡಿ." };
  }
  return { error: error.message };
}

// ಆಯ್ಕೆ ಮಾಡಿದ ಉಪವರ್ಗ ಪ್ರಾಡಕ್ಟ್‌ನ ವರ್ಗಕ್ಕೇ ಸೇರಿದ್ದೇ? (ಉದಾ: "ಕೀಟನಾಶಕ" ಬೀಜಗಳ ಪ್ರಾಡಕ್ಟ್‌ಗೆ ಬೇಡ)
async function checkSubcategory(supabaseAdmin, row) {
  if (row.subcategory_id == null) return null;
  const { data, error } = await supabaseAdmin.from("subcategories").select("category_slug").eq("id", row.subcategory_id).maybeSingle();
  if (error) return dbError(error);
  if (!data) return { error: "ಆಯ್ಕೆ ಮಾಡಿದ ಉಪವರ್ಗ ಇನ್ನು ಇಲ್ಲ. ಪಟ್ಟಿಯನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ." };
  if (categoryOf(row)?.slug !== data.category_slug) return { error: "ಉಪವರ್ಗ ಆಯ್ಕೆ ಮಾಡಿದ ವರ್ಗಕ್ಕೆ ಸೇರಿಲ್ಲ. ವರ್ಗ ಅಥವಾ ಉಪವರ್ಗ ಬದಲಿಸಿ." };
  return null;
}

// ಪ್ರಾಡಕ್ಟ್‌ನ ಫೋಟೋ/ವಿಡಿಯೋಗಳಲ್ಲಿ ನಮ್ಮ Storage ನಲ್ಲಿರುವ ಫೈಲ್‌ಗಳ ಪಾತ್‌ಗಳು
function storagePathsOf(product) {
  return [...getProductImages(product), product?.video_url].map(storagePathFromUrl).filter(Boolean);
}

async function removeStorageFiles(supabaseAdmin, paths) {
  if (!paths.length) return;
  // ಫೈಲ್ ಅಳಿಸುವುದು ವಿಫಲವಾದರೂ ಪ್ರಾಡಕ್ಟ್ ಬದಲಾವಣೆ ನಿಲ್ಲಬಾರದು
  const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.error("Storage cleanup failed:", error.message);
}

// ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು ಸರ್ವರ್‌ನಲ್ಲೇ: ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ಮಾತ್ರ, service role key ಬಳಸಿ
export async function addProduct(input) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const { row, error: invalid } = buildProductRow(input);
  if (invalid) return { error: invalid };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;

  const subError = await checkSubcategory(supabaseAdmin, row);
  if (subError) return subError;

  const { error } = await supabaseAdmin.from("products").insert([row]);
  if (error) return dbError(error);
  return { ok: true };
}

// ಪ್ರಾಡಕ್ಟ್ ಎಡಿಟ್: ತೆಗೆದುಹಾಕಿದ ಫೋಟೋ/ವಿಡಿಯೋ ಫೈಲ್‌ಗಳನ್ನು Storage ನಿಂದಲೂ ಅಳಿಸುತ್ತದೆ
export async function updateProduct(id, input) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const { row, error: invalid } = buildProductRow(input);
  if (invalid) return { error: invalid };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;

  const { data: existing, error: readError } = await supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle();
  if (readError) return dbError(readError);
  if (!existing) return { error: "ಈ ಪ್ರಾಡಕ್ಟ್ ಸಿಗಲಿಲ್ಲ (ಬಹುಶಃ ಈಗಾಗಲೇ ಅಳಿಸಲಾಗಿದೆ)." };

  const subError = await checkSubcategory(supabaseAdmin, row);
  if (subError) return subError;

  const { error } = await supabaseAdmin.from("products").update(row).eq("id", id);
  if (error) return dbError(error);

  const stillUsed = new Set(storagePathsOf(row));
  await removeStorageFiles(supabaseAdmin, storagePathsOf(existing).filter((p) => !stillUsed.has(p)));
  return { ok: true };
}

// ಪ್ರಾಡಕ್ಟ್ ಅಳಿಸುವುದು: ಡೇಟಾಬೇಸ್ ರೋ ಮತ್ತು ಅದರ ಎಲ್ಲಾ ಫೋಟೋ/ವಿಡಿಯೋ ಫೈಲ್‌ಗಳು
export async function deleteProduct(id) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;

  const { data: existing, error: readError } = await supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle();
  if (readError) return dbError(readError);
  if (!existing) return { ok: true };

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return dbError(error);

  await removeStorageFiles(supabaseAdmin, storagePathsOf(existing));
  return { ok: true };
}

// ಮುಖಪುಟದ ಕಾರ್ಡ್‌ನಿಂದಲೇ In Stock / Out of Stock ಬದಲಿಸುವುದು
export async function setProductStock(id, inStock) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;
  const { error } = await supabaseAdmin.from("products").update({ in_stock: inStock === true }).eq("id", id);
  if (error) return dbError(error);
  return { ok: true };
}

// ಈಗಿರುವ ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ಬ್ರಾಂಡ್‌ಗೆ ಸೇರಿಸುವುದು / ಬ್ರಾಂಡ್‌ನಿಂದ ತೆಗೆಯುವುದು (brandId = null)
export async function setProductBrand(id, brandId) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const clean = brandId === null || brandId === "" || brandId === undefined ? null : Number(brandId);
  if (clean !== null && (!Number.isInteger(clean) || clean <= 0)) return { error: "ಬ್ರಾಂಡ್ ಸರಿಯಿಲ್ಲ." };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;
  const { error } = await supabaseAdmin.from("products").update({ brand_id: clean }).eq("id", id);
  if (error) return dbError(error);
  return { ok: true };
}

// ಅಪ್‌ಲೋಡ್ ಆದರೂ ಸೇವ್ ಆಗದ ಫೈಲ್‌ಗಳನ್ನು ಅಳಿಸುವುದು (ಉದಾ: ಫಾರ್ಮ್ ಸೇವ್ ವಿಫಲವಾದಾಗ)
export async function discardUploads(urls) {
  if (!(await isAdmin())) return SESSION_EXPIRED;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return NO_SERVICE_KEY;
  const paths = (Array.isArray(urls) ? urls : []).map(storagePathFromUrl).filter(Boolean);
  await removeStorageFiles(supabaseAdmin, paths);
  return { ok: true };
}

// ಬ್ರೌಸರ್ ನೇರವಾಗಿ Storage ಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಒಂದು ಬಾರಿಯ signed URL (ದೊಡ್ಡ ವಿಡಿಯೋಗಳು ಸರ್ವರ್ ಮೂಲಕ ಹೋಗುವುದಿಲ್ಲ)
export async function createUploadUrl({ contentType, size }) {
  if (!(await isAdmin())) {
    return { error: "ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ." };
  }

  const kind = IMAGE_TYPES.includes(contentType) ? "images" : VIDEO_TYPES.includes(contentType) ? "videos" : null;
  if (!kind) {
    return { error: "ಈ ಫೈಲ್ ಪ್ರಕಾರ ಬೆಂಬಲಿತವಲ್ಲ. JPG/PNG/WebP/GIF ಫೋಟೋ ಅಥವಾ MP4/WebM/MOV ವಿಡಿಯೋ ಬಳಸಿ." };
  }
  if (!Number.isFinite(size) || size <= 0 || size > 50 * 1024 * 1024) {
    return { error: "ಫೈಲ್ ಗಾತ್ರ 50MB ಗಿಂತ ಕಡಿಮೆ ಇರಬೇಕು." };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ SUPABASE_SERVICE_ROLE_KEY ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }

  const ext = contentType.split("/")[1].replace("quicktime", "mov").replace("jpeg", "jpg");
  const path = `${kind}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: error.message };

  const { data: pub } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}
