-- JP Organics: products ಟೇಬಲ್‌ಗೆ Row Level Security
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ಇದನ್ನು ಒಮ್ಮೆ ರನ್ ಮಾಡಿ.
--
-- ಫಲಿತಾಂಶ:
--   * ವೆಬ್‌ಸೈಟ್ ನೋಡುವ ಎಲ್ಲರೂ (anon key) ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ಓದಬಹುದು.
--   * anon key ಬಳಸಿ ಯಾರೂ INSERT / UPDATE / DELETE ಮಾಡಲಾಗುವುದಿಲ್ಲ (ಅದಕ್ಕೆ ಯಾವುದೇ policy ಇಲ್ಲ).
--   * ಅಡ್ಮಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಸರ್ವರ್‌ನಲ್ಲಿ service_role key ಬಳಸುತ್ತದೆ, ಅದು RLS ಅನ್ನು ಬೈಪಾಸ್ ಮಾಡುತ್ತದೆ.

alter table public.products enable row level security;

-- ಹಿಂದೆ ಮಾಡಿದ ಯಾವುದೇ ತೆರೆದ policy ಗಳನ್ನು ತೆಗೆದುಹಾಕಿ (ಇದ್ದರೆ)
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'products'
  loop
    execute format('drop policy %I on public.products', p.policyname);
  end loop;
end $$;

create policy "Anyone can read products"
  on public.products
  for select
  to anon, authenticated
  using (true);
