-- ಬ್ರಾಂಡ್‌ಗಳು: ಹೆಸರು + ಲೋಗೋ. ಎಲ್ಲರೂ ಓದಬಹುದು, ಬದಲಾವಣೆ ಸರ್ವರ್ (ಅಡ್ಮಿನ್) ಮೂಲಕ ಮಾತ್ರ.
create table if not exists public.brands (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  logo_url text
);
-- ಒಂದೇ ಹೆಸರಿನ ಎರಡು ಬ್ರಾಂಡ್ ಬೇಡ (ದೊಡ್ಡ/ಸಣ್ಣ ಅಕ್ಷರ ವ್ಯತ್ಯಾಸವಿಲ್ಲದೆ)
create unique index if not exists brands_name_lower_idx on public.brands (lower(name));

alter table public.brands enable row level security;
drop policy if exists "Public can read brands" on public.brands;
create policy "Public can read brands" on public.brands for select to anon, authenticated using (true);

-- ಪ್ರತಿ ಪ್ರಾಡಕ್ಟ್‌ಗೆ ಒಂದು ಬ್ರಾಂಡ್ (ಐಚ್ಛಿಕ). ಬ್ರಾಂಡ್ ಅಳಿಸಿದರೆ ಪ್ರಾಡಕ್ಟ್ ಉಳಿಯುತ್ತದೆ, ಬ್ರಾಂಡ್ ಖಾಲಿಯಾಗುತ್ತದೆ.
alter table public.products add column if not exists brand_id bigint references public.brands(id) on delete set null;
create index if not exists products_brand_idx on public.products (brand_id);
