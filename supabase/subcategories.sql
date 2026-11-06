-- ಉಪವರ್ಗಗಳು: ಪ್ರತಿ ಮುಖ್ಯ ವರ್ಗದೊಳಗೆ (ಉದಾ: ಬೆಳೆ ಸಂರಕ್ಷಣೆ → ಕೀಟನಾಶಕ, ಶಿಲೀಂಧ್ರನಾಶಕ).
-- ಎಲ್ಲರೂ ಓದಬಹುದು; ಬದಲಾವಣೆ ಸರ್ವರ್ (ಅಡ್ಮಿನ್) ಮೂಲಕ ಮಾತ್ರ.
create table if not exists public.subcategories (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category_slug text not null check (category_slug in ('seeds', 'yield-booster', 'crop-protection', 'crop-nutrition', 'equipments')),
  name text not null check (char_length(name) between 1 and 80),
  name_en text check (name_en is null or char_length(name_en) <= 80),
  logo_url text,
  sort_order integer not null default 0
);
-- ಒಂದೇ ವರ್ಗದಲ್ಲಿ ಒಂದೇ ಹೆಸರಿನ ಎರಡು ಉಪವರ್ಗ ಬೇಡ
create unique index if not exists subcategories_name_idx on public.subcategories (category_slug, lower(name));

alter table public.subcategories enable row level security;
drop policy if exists "Public can read subcategories" on public.subcategories;
create policy "Public can read subcategories" on public.subcategories for select to anon, authenticated using (true);

-- ಪ್ರತಿ ಪ್ರಾಡಕ್ಟ್‌ಗೆ ಒಂದು ಉಪವರ್ಗ (ಐಚ್ಛಿಕ). ಉಪವರ್ಗ ಅಳಿಸಿದರೆ ಪ್ರಾಡಕ್ಟ್ ಉಳಿಯುತ್ತದೆ.
alter table public.products add column if not exists subcategory_id bigint references public.subcategories(id) on delete set null;
create index if not exists products_subcategory_idx on public.products (subcategory_id);
