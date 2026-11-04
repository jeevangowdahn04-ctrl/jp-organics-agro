// ಫೋಟೋ/ವಿಡಿಯೋ ಸಂಬಂಧಿತ ಸಹಾಯಕ ಫಂಕ್ಷನ್‌ಗಳು (ಸರ್ವರ್ ಮತ್ತು ಬ್ರೌಸರ್ ಎರಡರಲ್ಲೂ ಬಳಸಬಹುದು)

export const MEDIA_BUCKET = "product-media";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGES = 10;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Storage ನಲ್ಲಿರುವ ನಮ್ಮ ಬಕೆಟ್‌ನ public URL ಪ್ರಾರಂಭ
export function storagePublicPrefix() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/`;
}

export function isOurStorageUrl(value) {
  return typeof value === "string" && value.startsWith(storagePublicPrefix());
}

// ಬಕೆಟ್ ಒಳಗಿನ ಫೈಲ್ ಪಾತ್ (ಅಳಿಸಲು ಬೇಕು); ನಮ್ಮ Storage URL ಅಲ್ಲದಿದ್ದರೆ null
export function storagePathFromUrl(value) {
  return isOurStorageUrl(value) ? decodeURIComponent(value.slice(storagePublicPrefix().length)) : null;
}

// ಪ್ರಾಡಕ್ಟ್‌ನ ಎಲ್ಲಾ ಫೋಟೋಗಳು: ಹೊಸ image_urls, ಇಲ್ಲದಿದ್ದರೆ ಹಳೆಯ ಒಂದೇ image_url
export function getProductImages(product) {
  const list = Array.isArray(product?.image_urls) ? product.image_urls.filter((u) => typeof u === "string" && u) : [];
  if (list.length) return list;
  return product?.image_url ? [product.image_url] : [];
}

// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID ಎಲ್ಲವನ್ನೂ ಗುರುತಿಸುತ್ತದೆ
export function getYouTubeId(value) {
  if (typeof value !== "string") return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
