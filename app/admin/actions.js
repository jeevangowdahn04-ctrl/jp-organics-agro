"use server";

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

export async function login(prevState, formData) {
  if (!(await checkPassword(formData.get("password")))) {
    return { error: "ತಪ್ಪು ಪಾಸ್‌ವರ್ಡ್. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." };
  }

  (await cookies()).set(ADMIN_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 8, // 8 ಗಂಟೆ
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}

// RECOVERY_PIN ಸರಿಯಿದ್ದರೆ ಹೊಸ ಅಡ್ಮಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಮಾಡುವುದು
export async function resetPassword(prevState, formData) {
  // ಊಹಿಸಿ ಪ್ರಯತ್ನಿಸುವುದನ್ನು ನಿಧಾನಗೊಳಿಸಲು ಸಣ್ಣ ವಿರಾಮ
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!process.env.RECOVERY_PIN) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ RECOVERY_PIN ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }
  if (!checkRecoveryPin(formData.get("pin"))) {
    return { error: "ತಪ್ಪು Recovery PIN." };
  }

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
  name, nameEn, price, mrp, category, categoryEn, weight, description, descriptionEn, highlights, highlightsEn, inStock, imageUrls, videoUrl,
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

  return {
    row: {
      name: cleanName,
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
  if (error.code === "42703" || error.code === "PGRST204") {
    return { error: "ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಬೇಕಾದ ಕಾಲಂ ಇಲ್ಲ (name_en / category_en / description_en / highlights_en). supabase/product-bilingual.sql ರನ್ ಮಾಡಿ." };
  }
  return { error: error.message };
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
