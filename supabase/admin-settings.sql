-- JP Organics: ಅಡ್ಮಿನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳ ಟೇಬಲ್ (Forgot Password ಮೂಲಕ ಸೆಟ್ ಮಾಡಿದ ಪಾಸ್‌ವರ್ಡ್ hash ಇಲ್ಲಿರುತ್ತದೆ)
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ಇದನ್ನು ಒಮ್ಮೆ ರನ್ ಮಾಡಿ.
--
-- RLS ಆನ್ ಆಗಿದೆ ಮತ್ತು ಯಾವುದೇ policy ಇಲ್ಲ: anon key ಮೂಲಕ ಯಾರೂ ಇದನ್ನು ಓದಲು/ಬರೆಯಲು ಆಗುವುದಿಲ್ಲ.
-- ಸರ್ವರ್ ಮಾತ್ರ service_role key ಬಳಸಿ ಇದನ್ನು ಬಳಸುತ್ತದೆ.

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;
