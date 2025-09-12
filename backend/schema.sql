-- Supabase schema for Moment app
-- Run this in Supabase SQL editor or via supabase CLI

-- Extensions (gen_random_uuid)
create extension if not exists "pgcrypto" with schema extensions;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  location text,
  level text,
  genres text[] default '{}'::text[]
);

-- Backfill-safe: ensure an email column exists for username login lookups
alter table public.profiles add column if not exists email text;

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are readable by anyone'
  ) then
    create policy "Profiles are readable by anyone" on public.profiles for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email/full_name in sync when auth.users changes
create or replace function public.handle_updated_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
    set full_name = coalesce(new.raw_user_meta_data->>'full_name', p.full_name),
        email = new.email
  where p.id = new.id;
  return new;
end; $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_updated_user();

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  exif jsonb,
  created_at timestamptz not null default now()
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists photos_user_created_idx on public.photos (user_id, created_at desc);

alter table public.photos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='photos' and policyname='Photos are readable by anyone'
  ) then
    create policy "Photos are readable by anyone" on public.photos for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='photos' and policyname='Users can insert own photos'
  ) then
    create policy "Users can insert own photos" on public.photos for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='photos' and policyname='Users can update own photos'
  ) then
    create policy "Users can update own photos" on public.photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='photos' and policyname='Users can delete own photos'
  ) then
    create policy "Users can delete own photos" on public.photos for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Likes
create table if not exists public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

create index if not exists likes_photo_idx on public.likes (photo_id);

alter table public.likes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='Likes are readable by anyone'
  ) then
    create policy "Likes are readable by anyone" on public.likes for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='Users can like as themselves'
  ) then
    create policy "Users can like as themselves" on public.likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='Users can remove own likes'
  ) then
    create policy "Users can remove own likes" on public.likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_photo_created_idx on public.comments (photo_id, created_at);

alter table public.comments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='Comments are readable by anyone'
  ) then
    create policy "Comments are readable by anyone" on public.comments for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='Users can insert own comments'
  ) then
    create policy "Users can insert own comments" on public.comments for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='Users can update own comments'
  ) then
    create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='Users can delete own comments'
  ) then
    create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Follows (optional: for followers/following counts)
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create index if not exists follows_followed_idx on public.follows (followed_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Follows are readable by anyone'
  ) then
    create policy "Follows are readable by anyone" on public.follows for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Users can follow as themselves'
  ) then
    create policy "Users can follow as themselves" on public.follows for insert with check (auth.uid() = follower_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Users can unfollow as themselves'
  ) then
    create policy "Users can unfollow as themselves" on public.follows for delete using (auth.uid() = follower_id);
  end if;
end $$;

-- Waitlist (optional: capture landing page signups)
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  unique(email)
);

alter table public.waitlist enable row level security;

do $$ begin
  -- Allow anonymous inserts (no read access by default)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='waitlist' and policyname='Public can insert waitlist'
  ) then
    create policy "Public can insert waitlist" on public.waitlist for insert with check (true);
  end if;
end $$;

-- Storage: create public bucket and policies for per-user folders
-- Create bucket if missing
select extensions.storage.create_bucket('photos', public => true);

-- Policies on storage.objects
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read for photos bucket'
  ) then
    create policy "Public read for photos bucket" on storage.objects for select using (bucket_id = 'photos');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can upload to their folder'
  ) then
    create policy "Users can upload to their folder" on storage.objects
      for insert with check (
        bucket_id = 'photos'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can update own objects'
  ) then
    create policy "Users can update own objects" on storage.objects
      for update using (
        bucket_id = 'photos' and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can delete own objects'
  ) then
    create policy "Users can delete own objects" on storage.objects
      for delete using (
        bucket_id = 'photos' and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

-- Communities (public groups of interest)
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  description text,
  cover_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists communities_created_idx on public.communities (created_at desc);

alter table public.communities enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='communities' and policyname='Communities readable by anyone'
  ) then
    create policy "Communities readable by anyone" on public.communities for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='communities' and policyname='Users can create communities'
  ) then
    create policy "Users can create communities" on public.communities for insert with check (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='communities' and policyname='Owners can update community'
  ) then
    create policy "Owners can update community" on public.communities for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='communities' and policyname='Owners can delete community'
  ) then
    create policy "Owners can delete community" on public.communities for delete using (auth.uid() = created_by);
  end if;
end $$;

-- Community membership
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.community_members enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_members' and policyname='Members readable by anyone'
  ) then
    create policy "Members readable by anyone" on public.community_members for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_members' and policyname='Users can join communities'
  ) then
    create policy "Users can join communities" on public.community_members for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_members' and policyname='Users can leave communities'
  ) then
    create policy "Users can leave communities" on public.community_members for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Posts mapped to existing photos via a join table
create table if not exists public.community_photo_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (community_id, photo_id)
);

create index if not exists cpp_comm_created_idx on public.community_photo_posts (community_id, created_at desc);

alter table public.community_photo_posts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_photo_posts' and policyname='Community posts readable by anyone'
  ) then
    create policy "Community posts readable by anyone" on public.community_photo_posts for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_photo_posts' and policyname='Members can post photos'
  ) then
    create policy "Members can post photos" on public.community_photo_posts
      for insert with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.community_members m
          where m.community_id = community_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_photo_posts' and policyname='Owners can remove own posts'
  ) then
    create policy "Owners can remove own posts" on public.community_photo_posts for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Generic community posts (text/photo/link)
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text','photo','link')),
  body text,
  photo_id uuid references public.photos(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_comm_created_idx on public.community_posts (community_id, created_at desc);

alter table public.community_posts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='Community posts readable by anyone'
  ) then
    create policy "Community posts readable by anyone" on public.community_posts for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='Members can create posts'
  ) then
    create policy "Members can create posts" on public.community_posts
      for insert with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.community_members m
          where m.community_id = community_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='Owners can update own posts'
  ) then
    create policy "Owners can update own posts" on public.community_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='Owners can delete own posts'
  ) then
    create policy "Owners can delete own posts" on public.community_posts for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Enhance community_posts with title and optional link URL (idempotent)
alter table public.community_posts
  add column if not exists title text not null default '';
alter table public.community_posts
  add column if not exists link_url text;

-- Likes on community posts
create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_post_likes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_likes' and policyname='Likes readable by anyone'
  ) then
    create policy "Likes readable by anyone" on public.community_post_likes for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_likes' and policyname='Users can like as themselves'
  ) then
    create policy "Users can like as themselves" on public.community_post_likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_likes' and policyname='Users can unlike own like'
  ) then
    create policy "Users can unlike own like" on public.community_post_likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Comments on community posts
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_post_comments_post_created_idx on public.community_post_comments (post_id, created_at);

alter table public.community_post_comments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_comments' and policyname='Comments readable by anyone'
  ) then
    create policy "Comments readable by anyone" on public.community_post_comments for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_comments' and policyname='Members can comment'
  ) then
    create policy "Members can comment" on public.community_post_comments
      for insert with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.community_members m
          join public.community_posts p on p.community_id = m.community_id
          where p.id = post_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_comments' and policyname='Users can update own comments'
  ) then
    create policy "Users can update own comments" on public.community_post_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_post_comments' and policyname='Users can delete own comments'
  ) then
    create policy "Users can delete own comments" on public.community_post_comments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Optional threading support: parent_id on comments (flat by default)
alter table public.community_post_comments
  add column if not exists parent_id uuid references public.community_post_comments(id) on delete cascade;

-- Gag Jobs (job board for photographers)
create table if not exists public.gag_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  is_remote boolean not null default false,
  job_type text check (job_type in ('one-off','part-time','full-time','collab')) default 'one-off',
  pay_type text check (pay_type in ('fixed','hourly','day','project')) default 'project',
  pay_min integer,
  pay_max integer,
  pay_currency text default 'USD',
  tags text[] not null default '{}'::text[],
  contact_email text,
  contact_url text,
  status text not null check (status in ('open','closed','draft')) default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists gag_jobs_created_idx on public.gag_jobs (created_at desc);
create index if not exists gag_jobs_status_idx on public.gag_jobs (status);
create index if not exists gag_jobs_tags_gin on public.gag_jobs using gin (tags);

alter table public.gag_jobs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_jobs' and policyname='Gigs readable if open or owner'
  ) then
    create policy "Gigs readable if open or owner" on public.gag_jobs
      for select using (status = 'open' or auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_jobs' and policyname='Users can insert own gigs'
  ) then
    create policy "Users can insert own gigs" on public.gag_jobs
      for insert with check (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_jobs' and policyname='Users can update own gigs'
  ) then
    create policy "Users can update own gigs" on public.gag_jobs
      for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_jobs' and policyname='Users can delete own gigs'
  ) then
    create policy "Users can delete own gigs" on public.gag_jobs
      for delete using (auth.uid() = created_by);
  end if;
end $$;

-- Applications to Gag Jobs
create table if not exists public.gag_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.gag_jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  message text,
  portfolio_url text,
  status text not null check (status in ('applied','reviewed','accepted','rejected')) default 'applied',
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index if not exists gag_applications_job_idx on public.gag_applications (job_id);
create index if not exists gag_applications_applicant_idx on public.gag_applications (applicant_id);

alter table public.gag_applications enable row level security;

do $$ begin
  -- Applicants can insert their own application
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_applications' and policyname='Applicants can insert own application'
  ) then
    create policy "Applicants can insert own application" on public.gag_applications
      for insert with check (auth.uid() = applicant_id);
  end if;
  -- Applicants can read their own application
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_applications' and policyname='Applicants can read own application'
  ) then
    create policy "Applicants can read own application" on public.gag_applications
      for select using (auth.uid() = applicant_id);
  end if;
  -- Job owners can read applications to their jobs
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_applications' and policyname='Owners can read applications to their jobs'
  ) then
    create policy "Owners can read applications to their jobs" on public.gag_applications
      for select using (exists (select 1 from public.gag_jobs j where j.id = job_id and j.created_by = auth.uid()));
  end if;
  -- Job owners can update status for their jobs' applications
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_applications' and policyname='Owners can update application status'
  ) then
    create policy "Owners can update application status" on public.gag_applications
      for update using (exists (select 1 from public.gag_jobs j where j.id = job_id and j.created_by = auth.uid()));
  end if;
  -- Applicants can delete their application (optional)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='gag_applications' and policyname='Applicants can delete own application'
  ) then
    create policy "Applicants can delete own application" on public.gag_applications
      for delete using (auth.uid() = applicant_id);
  end if;
end $$;
