-- JP Organics: ರೈತರ ಅನುಭವ & ಫಲಿತಾಂಶಗಳು (Farmer Stories)
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ರನ್ ಮಾಡಿ:
--   https://supabase.com/dashboard/project/ceiywdsvcxmukeqlwlmc/sql/new
--
-- ಯಾರು ಬೇಕಾದರೂ ಕಳುಹಿಸಬಹುದು (ಸರ್ವರ್ ಮೂಲಕ, status = 'pending'),
-- ಅಡ್ಮಿನ್ 'approved' ಮಾಡಿದ ನಂತರವೇ ಎಲ್ಲರಿಗೂ ಕಾಣಿಸುತ್ತದೆ.

create table if not exists public.farmer_stories (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  farmer_name text not null,
  village text,
  product text,
  crop text,
  note text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'approved'))
);

alter table public.farmer_stories enable row level security;

-- ಸಾರ್ವಜನಿಕರು ಅನುಮೋದಿತ ಕಥೆಗಳನ್ನು ಮಾತ್ರ ಓದಬಹುದು; ಬರೆಯುವುದು/ಅಳಿಸುವುದು ಸರ್ವರ್ (service_role) ಮೂಲಕ ಮಾತ್ರ
drop policy if exists "Public can read approved stories" on public.farmer_stories;
create policy "Public can read approved stories"
  on public.farmer_stories
  for select
  to anon, authenticated
  using (status = 'approved');
