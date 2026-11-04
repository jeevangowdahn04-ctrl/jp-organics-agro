// ಫೋಟೋ/ವಿಡಿಯೋ ಸಂಬಂಧಿತ ಸಹಾಯಕ ಫಂಕ್ಷನ್‌ಗಳು (ಸರ್ವರ್ ಮತ್ತು ಬ್ರೌಸರ್ ಎರಡರಲ್ಲೂ ಬಳಸಬಹುದು)

export const MEDIA_BUCKET = "product-media";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
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
