import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// ಅಡ್ಮಿನ್ ಲಾಗಿನ್ / Recovery PIN ಊಹೆ ತಡೆ (ಸರ್ವರ್‌ನಲ್ಲಿ ಮಾತ್ರ).
// ಒಂದೇ ಇಂಟರ್ನೆಟ್ ವಿಳಾಸದಿಂದ (IP) WINDOW ಒಳಗೆ MAX_FAILS ತಪ್ಪು ಪ್ರಯತ್ನಗಳಾದರೆ LOCK ಸಮಯ ಲಾಗಿನ್ ಬಂದ್.
// ಎಣಿಕೆ admin_settings ಟೇಬಲ್‌ನಲ್ಲಿ (ಎಲ್ಲಾ Vercel ಸರ್ವರ್‌ಗಳಿಗೂ ಒಂದೇ); IP ನೇರವಾಗಿ ಉಳಿಯುವುದಿಲ್ಲ, hash ಮಾತ್ರ.

const RULES = {
  login: { maxFails: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  pin: { maxFails: 5, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 },
};
const PREFIX = "login_guard:";
const memory = new Map(); // Supabase ಸಿಗದಿದ್ದರೆ ಮಾತ್ರ (ಉದಾ: ಸರ್ವಿಸ್ ಕೀ ಇಲ್ಲದ ಲೋಕಲ್)

async function keyFor(kind) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return `${PREFIX}${kind}:${createHash("sha256").update(`jp-guard|${ip}`).digest("hex").slice(0, 32)}`;
}

async function read(sb, key) {
  if (!sb) return memory.get(key) ?? { fails: [], until: 0 };
  const { data } = await sb.from("admin_settings").select("value").eq("key", key).maybeSingle();
  try {
    const v = data?.value ? JSON.parse(data.value) : null;
    return { fails: Array.isArray(v?.fails) ? v.fails : [], until: Number(v?.until) || 0 };
  } catch {
    return { fails: [], until: 0 };
  }
}

async function write(sb, key, state) {
  if (!sb) return void memory.set(key, state);
  await sb.from("admin_settings").upsert({ key, value: JSON.stringify(state), updated_at: new Date().toISOString() });
}

const minutesLeft = (until) => Math.max(1, Math.ceil((until - Date.now()) / 60000));

// ಈಗ ಲಾಕ್ ಆಗಿದೆಯೇ? ಆಗಿದ್ದರೆ ಎಷ್ಟು ನಿಮಿಷ ಬಾಕಿ, ಇಲ್ಲದಿದ್ದರೆ null
export async function lockedMinutes(kind) {
  const sb = getSupabaseAdmin();
  const state = await read(sb, await keyFor(kind));
  return state.until > Date.now() ? minutesLeft(state.until) : null;
}

// ತಪ್ಪು ಪ್ರಯತ್ನ ದಾಖಲಿಸುವುದು: { lockedMinutes } (ಈಗ ಲಾಕ್ ಆಯಿತು) ಅಥವಾ { remaining } (ಇನ್ನೆಷ್ಟು ಪ್ರಯತ್ನ ಬಾಕಿ)
export async function recordFailure(kind) {
  const rule = RULES[kind];
  const sb = getSupabaseAdmin();
  const key = await keyFor(kind);
  const now = Date.now();
  const state = await read(sb, key);
  const fails = [...state.fails.filter((t) => now - t < rule.windowMs), now];
  if (fails.length >= rule.maxFails) {
    const until = now + rule.lockMs;
    await write(sb, key, { fails: [], until });
    await cleanup(sb);
    return { lockedMinutes: minutesLeft(until) };
  }
  await write(sb, key, { fails, until: 0 });
  return { remaining: rule.maxFails - fails.length };
}

// ಸರಿಯಾದ ಲಾಗಿನ್ ಆದಾಗ ಎಣಿಕೆ ತೆರವು
export async function clearFailures(kind) {
  const sb = getSupabaseAdmin();
  const key = await keyFor(kind);
  if (!sb) return void memory.delete(key);
  await sb.from("admin_settings").delete().eq("key", key);
}

// ಒಂದು ದಿನಕ್ಕಿಂತ ಹಳೆಯ ಎಣಿಕೆಗಳನ್ನು ತೆಗೆಯುವುದು (ಟೇಬಲ್ ಬೆಳೆಯದಂತೆ)
async function cleanup(sb) {
  if (!sb) return;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await sb.from("admin_settings").delete().like("key", `${PREFIX}%`).lt("updated_at", dayAgo);
}
