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
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
