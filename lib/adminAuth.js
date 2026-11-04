import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "jp_admin_session";

// ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದಲೇ ಸೆಷನ್ ಟೋಕನ್ ತಯಾರಿಸುವುದು: ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾದರೆ ಹಳೆಯ ಲಾಗಿನ್‌ಗಳು ತಾನಾಗೇ ಅಮಾನ್ಯವಾಗುತ್ತವೆ
export function sessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("jp-admin-session").digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(input) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && typeof input === "string" && safeEqual(input, password);
}

export async function isAdmin() {
  const token = sessionToken();
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(token && cookie) && safeEqual(cookie, token);
}
