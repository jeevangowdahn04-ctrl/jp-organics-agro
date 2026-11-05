import type { TranslationKey } from "@/lib/i18n";

// ರೈತ ಸಮುದಾಯದ ಹಂಚಿಕೆಯ ಪ್ರಕಾರಗಳು ಮತ್ತು ಸಹಾಯಕಗಳು (ಬ್ರೌಸರ್ ಭಾಗ)

export interface FarmerProfile {
  id: string;
  name: string;
  village: string | null;
  avatar_url: string | null;
  friends?: number;
}

export interface CommunityPost {
  id: number;
  created_at: string;
  kind: "post" | "reel";
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  author: FarmerProfile | null;
  likes: number;
  comments: number;
  liked: boolean;
  mine: boolean;
}

export interface PostComment {
  id: number;
  created_at: string;
  body: string;
  author: FarmerProfile | null;
}

export type Relation = "self" | "none" | "sent" | "received" | "friends";

export type Viewer = { name: string; phone: string } | null;

export const viewerOf = (c: { name: string; phone: string } | null | undefined): Viewer =>
  c ? { name: c.name, phone: c.phone } : null;

const ERRORS = ["login", "type", "size", "rate", "server", "table", "media"] as const;
export function communityError(code: unknown): TranslationKey {
  return (ERRORS as readonly unknown[]).includes(code) ? (`community.err.${code}` as TranslationKey) : "community.err.server";
}

// ದೊಡ್ಡ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್‌ಗೆ ಮುನ್ನ ಚಿಕ್ಕದಾಗಿಸುವುದು (ಉದ್ದದ ಬದಿ 1600px, JPEG) – ಮೊಬೈಲ್ ಡೇಟಾ ಉಳಿತಾಯ
export async function shrinkPhoto(file: File, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("load"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function timeAgo(iso: string, lang: "kn" | "en") {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "kn" ? "kn-IN" : "en-IN", { numeric: "auto" });
  if (diff < 60) return rtf.format(0, "minute");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.floor(diff / 86400), "day");
  return new Date(iso).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
}
