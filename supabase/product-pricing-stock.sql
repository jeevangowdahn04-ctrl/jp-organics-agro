-- JP Organics: ಸ್ಟಾಕ್ ಸ್ಥಿತಿ ಮತ್ತು ಪ್ರಮುಖ ಅಂಶಗಳು (key highlights)
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ರನ್ ಮಾಡಿ:
--   https://supabase.com/dashboard/project/ceiywdsvcxmukeqlwlmc/sql/new
--
-- ಸೂಚನೆ: MRP / ಮೂಲ ಬೆಲೆಗೆ ಈಗಾಗಲೇ ಇರುವ "mrp" ಕಾಲಂ ಬಳಸಲಾಗುತ್ತದೆ (ಹೊಸ original_price ಬೇಕಿಲ್ಲ).
--         ಮಾರಾಟ / ಆಫರ್ ಬೆಲೆ = "price".

-- In Stock / Out of Stock (ಹಳೆಯ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ತಾನಾಗೇ "In Stock")
alter table public.products add column if not exists in_stock boolean not null default true;

-- ಪ್ರಮುಖ ಅಂಶಗಳು: ಪ್ರತಿ ಸಾಲು ಒಂದು ಬುಲೆಟ್ ಪಾಯಿಂಟ್
alter table public.products add column if not exists highlights text;
