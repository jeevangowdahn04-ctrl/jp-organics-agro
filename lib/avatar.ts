// ಪ್ರೊಫೈಲ್ ಫೋಟೋವನ್ನು ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಚಿಕ್ಕದಾಗಿಸಿ (ಚೌಕಾಕಾರ, 256px JPEG) data URL ಆಗಿ ಕೊಡುತ್ತದೆ.
// ಸಣ್ಣ ಗಾತ್ರ (~20-40KB) ಇರುವುದರಿಂದ localStorage ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಬಹುದು.
export const AVATAR_SIZE = 256;

export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("load-failed"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    // ಮಧ್ಯಭಾಗದ ಚೌಕ (center crop)
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const isAvatarDataUrl = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("data:image/") && v.length < 400_000;
