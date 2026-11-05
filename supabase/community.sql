-- ರೈತರ ಸಮುದಾಯ: ಪ್ರೊಫೈಲ್, ಪೋಸ್ಟ್/ರೀಲ್ಸ್, ಫ್ರೆಂಡ್ಸ್, ಲೈಕ್, ಕಾಮೆಂಟ್, ರಿಪೋರ್ಟ್.
-- ಎಲ್ಲಾ ಓದು/ಬರಹ ಸರ್ವರ್ (service role) ಮೂಲಕ ಮಾತ್ರ; ಆದ್ದರಿಂದ RLS ಆನ್ ಮಾಡಿ ಯಾವುದೇ public policy ಇಲ್ಲ.
-- (ಮೊಬೈಲ್ ನಂಬರ್‌ಗಳು ಬ್ರೌಸರ್‌ಗೆ ನೇರವಾಗಿ ಎಂದಿಗೂ ಸಿಗುವುದಿಲ್ಲ.)

create table if not exists public.community_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  phone text not null unique,
  name text not null,
  village text,
  avatar_url text,
  avatar_hash text
);

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  profile_id uuid not null references public.community_profiles(id) on delete cascade,
  kind text not null check (kind in ('post', 'reel')),
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  hidden boolean not null default false
);
create index if not exists community_posts_profile_idx on public.community_posts (profile_id, created_at desc);
create index if not exists community_posts_kind_idx on public.community_posts (kind, created_at desc);

create table if not exists public.friendships (
  requester_id uuid not null references public.community_profiles(id) on delete cascade,
  addressee_id uuid not null references public.community_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- ಒಂದು ಜೋಡಿಗೆ ಒಂದೇ ಸಾಲು (ಯಾರು ಮೊದಲು ಕಳುಹಿಸಿದರೂ)
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

create table if not exists public.post_likes (
  post_id bigint not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.community_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  post_id bigint not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.community_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500)
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.post_reports (
  post_id bigint not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.community_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.friendships enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reports enable row level security;
