import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const ADMIN_COOKIE = "jp_admin_session";
const PASSWORD_HASH_KEY = "admin_password_hash";

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyHash(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(password, salt, 64).toString("hex"), hash);
}

// Reset ಫಾರ್ಮ್ ಮೂಲಕ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಆಗಿದ್ದರೆ ಅದರ hash Supabase ನ admin_settings ನಲ್ಲಿರುತ್ತದೆ
async function getStoredHash() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", PASSWORD_HASH_KEY)
    .maybeSingle();
  if (error || !data) return null;
  return data.value;
}

export async function saveAdminPassword(newPassword) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ SUPABASE_SERVICE_ROLE_KEY ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }
  const { error } = await supabaseAdmin
    .from("admin_settings")
    .upsert({ key: PASSWORD_HASH_KEY, value: hashPassword(newPassword), updated_at: new Date().toISOString() });
  return error ? { error: error.message } : { ok: true };
}

// ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದಲೇ ಸೆಷನ್ ಟೋಕನ್ ತಯಾರಿಸುವುದು: ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾದರೆ ಹಳೆಯ ಲಾಗಿನ್‌ಗಳು ತಾನಾಗೇ ಅಮಾನ್ಯವಾಗುತ್ತವೆ
export async function sessionToken() {
  const secret = (await getStoredHash()) || process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return createHmac("sha256", secret).update("jp-admin-session").digest("hex");
}

export async function checkPassword(input) {
  if (typeof input !== "string" || !input) return false;
  const stored = await getStoredHash();
  if (stored) return verifyHash(input, stored);
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && safeEqual(input, password);
}

export function checkRecoveryPin(input) {
  const pin = process.env.RECOVERY_PIN;
  return Boolean(pin) && typeof input === "string" && safeEqual(input, pin);
}

export async function isAdmin() {
  const token = await sessionToken();
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(token && cookie) && safeEqual(cookie, token);
}
