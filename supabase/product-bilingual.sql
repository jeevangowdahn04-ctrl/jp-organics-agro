-- JP Organics: ಪ್ರಾಡಕ್ಟ್ ಮಾಹಿತಿಯ English ಆವೃತ್ತಿ
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ರನ್ ಮಾಡಿ:
--   https://supabase.com/dashboard/project/ceiywdsvcxmukeqlwlmc/sql/new
--
-- ಈಗಿರುವ name / category / description / highlights = ಕನ್ನಡ (ಮುಖ್ಯ ಭಾಷೆ).
-- ಹೊಸ *_en ಕಾಲಂಗಳು = English. ಒಂದು ಭಾಷೆ ಖಾಲಿ ಇದ್ದರೆ ವೆಬ್‌ಸೈಟ್ ಇನ್ನೊಂದನ್ನು ತೋರಿಸುತ್ತದೆ.

alter table public.products
add column if not exists name_en text,
add column if not exists category_en text,
add column if not exists description_en text,
add column if not exists highlights_en jsonb default '[]'::jsonb;
