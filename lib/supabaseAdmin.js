import { createClient } from "@supabase/supabase-js";

// ಸರ್ವರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಬಳಸಬೇಕು: service role key RLS ಅನ್ನು ಬೈಪಾಸ್ ಮಾಡುತ್ತದೆ, ಇದನ್ನು ಎಂದಿಗೂ ಬ್ರೌಸರ್‌ಗೆ ಕಳುಹಿಸಬಾರದು
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
