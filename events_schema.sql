-- Events Tables for Moment App
-- Run this in your Supabase SQL Editor to add Events functionality

-- First, add context field to photos table to separate regular posts from event/community photos
alter table public.photos add column if not exists context text default 'post' check (context in ('post', 'event', 'community'));

-- Set default context for existing photos (they are regular posts)
update public.photos set context = 'post' where context is null;

-- Create index for efficient context filtering
create index if not exists photos_context_idx on public.photos (context);
create index if not exists photos_context_created_idx on public.photos (context, created_at desc);

-- Events: photowalks, meetups, challenges, etc.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date timestamptz,
  event_type text check (event_type in ('photowalk', 'meetup', 'challenge', 'workshop', 'exhibition', 'other')),
  max_participants integer,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_created_by_idx on public.events (created_by);
create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists events_event_type_idx on public.events (event_type);

alter table public.events enable row level security;

do $$ begin
  -- Events are readable by anyone
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Events are readable by anyone'
  ) then
    create policy "Events are readable by anyone" on public.events for select using (true);
  end if;
  -- Users can create events
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Users can create events'
  ) then
    create policy "Users can create events" on public.events for insert with check (auth.uid() = created_by);
  end if;
  -- Users can update their own events
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Users can update own events'
  ) then
    create policy "Users can update own events" on public.events for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
  end if;
  -- Users can delete their own events
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Users can delete own events'
  ) then
    create policy "Users can delete own events" on public.events for delete using (auth.uid() = created_by);
  end if;
end $$;

-- Event Participants: RSVP and attendance tracking
create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'maybe', 'not_going', 'attended')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_participants_event_idx on public.event_participants (event_id);
create index if not exists event_participants_user_idx on public.event_participants (user_id);

alter table public.event_participants enable row level security;

do $$ begin
  -- Event participants are readable by anyone
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_participants' and policyname='Event participants are readable by anyone'
  ) then
    create policy "Event participants are readable by anyone" on public.event_participants for select using (true);
  end if;
  -- Users can RSVP to events
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_participants' and policyname='Users can RSVP to events'
  ) then
    create policy "Users can RSVP to events" on public.event_participants for insert with check (auth.uid() = user_id);
  end if;
  -- Users can update their own RSVP
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_participants' and policyname='Users can update own RSVP'
  ) then
    create policy "Users can update own RSVP" on public.event_participants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  -- Users can delete their own RSVP
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_participants' and policyname='Users can delete own RSVP'
  ) then
    create policy "Users can delete own RSVP" on public.event_participants for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Event Photos: photos specifically uploaded for an event
create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, photo_id)
);

create index if not exists event_photos_event_idx on public.event_photos (event_id);
create index if not exists event_photos_photo_idx on public.event_photos (photo_id);
create index if not exists event_photos_uploaded_by_idx on public.event_photos (uploaded_by);

alter table public.event_photos enable row level security;

do $$ begin
  -- Event photos are readable by anyone
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_photos' and policyname='Event photos are readable by anyone'
  ) then
    create policy "Event photos are readable by anyone" on public.event_photos for select using (true);
  end if;
  -- Users can add photos to events they're participating in
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_photos' and policyname='Participants can add photos to events'
  ) then
    create policy "Participants can add photos to events" on public.event_photos 
      for insert with check (
        auth.uid() = uploaded_by AND 
        exists (select 1 from public.event_participants ep where ep.event_id = event_photos.event_id and ep.user_id = auth.uid())
      );
  end if;
  -- Users can remove their own photos from events
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_photos' and policyname='Users can remove own event photos'
  ) then
    create policy "Users can remove own event photos" on public.event_photos for delete using (auth.uid() = uploaded_by);
  end if;
end $$;

-- Helper views for easier querying (optional)

-- View to get events with participant counts
create or replace view public.events_with_counts as
select 
  e.*,
  coalesce(p.participant_count, 0) as participant_count,
  coalesce(ph.photo_count, 0) as photo_count
from public.events e
left join (
  select event_id, count(*) as participant_count
  from public.event_participants 
  where status = 'going'
  group by event_id
) p on e.id = p.event_id
left join (
  select event_id, count(*) as photo_count
  from public.event_photos
  group by event_id
) ph on e.id = ph.event_id;

-- View to get upcoming events
create or replace view public.upcoming_events as
select * from public.events_with_counts
where event_date > now()
order by event_date asc;

-- View to get past events
create or replace view public.past_events as
select * from public.events_with_counts
where event_date <= now()
order by event_date desc;

-- Demo Data for Testing (remove in production)
-- Insert some sample events
insert into public.events (id, title, description, location, event_date, event_type, max_participants, created_by) values
('550e8400-e29b-41d4-a716-446655440001', 'Golden Hour Photowalk', 'Join us for a magical sunset photography session in downtown. We''ll explore hidden alleys, capture street art, and chase the perfect golden hour light. Perfect for photographers of all levels!', 'Downtown Arts District', '2025-09-25 18:00:00+00', 'photowalk', 15, (select id from auth.users limit 1)),
('550e8400-e29b-41d4-a716-446655440002', 'Portrait Masterclass', 'Learn advanced portrait techniques with professional photographer Sarah Chen. Covers natural lighting, posing, and post-processing workflows. Bring your camera and one model.', 'Studio 42, Main Street', '2025-09-30 14:00:00+00', 'workshop', 10, (select id from auth.users limit 1)),
('550e8400-e29b-41d4-a716-446655440003', 'Urban Night Photography Challenge', 'Capture the city after dark! A competitive photo challenge focusing on long exposures, neon lights, and street scenes. Prizes for top 3 photos.', 'City Center', '2025-10-05 20:00:00+00', 'challenge', 20, (select id from auth.users limit 1)),
('550e8400-e29b-41d4-a716-446655440004', 'Autumn Landscape Meetup', 'Explore the beautiful fall colors at Riverside Park. Group hike with photography stops at scenic viewpoints. Carpooling available.', 'Riverside Park Entrance', '2025-10-12 08:00:00+00', 'meetup', 25, (select id from auth.users limit 1)),
('550e8400-e29b-41d4-a716-446655440005', 'Street Photography Exhibition', 'Showcase and discussion of contemporary street photography. Featured works from local photographers plus open mic for portfolio reviews.', 'Gallery 23', '2025-10-18 19:00:00+00', 'exhibition', 50, (select id from auth.users limit 1)),
('550e8400-e29b-41d4-a716-446655440006', 'Sunset at the Pier - PAST EVENT', 'Beautiful sunset photography session at the old pier. Great turnout with amazing shots captured!', 'Old Harbor Pier', '2025-09-10 19:30:00+00', 'photowalk', 12, (select id from auth.users limit 1));

-- Insert sample participants (RSVPs)
-- Note: This uses the first user ID from auth.users table
insert into public.event_participants (event_id, user_id, status) values
('550e8400-e29b-41d4-a716-446655440001', (select id from auth.users limit 1), 'going'),
('550e8400-e29b-41d4-a716-446655440002', (select id from auth.users limit 1), 'maybe'),
('550e8400-e29b-41d4-a716-446655440003', (select id from auth.users limit 1), 'going'),
('550e8400-e29b-41d4-a716-446655440004', (select id from auth.users limit 1), 'going'),
('550e8400-e29b-41d4-a716-446655440005', (select id from auth.users limit 1), 'not_going'),
('550e8400-e29b-41d4-a716-446655440006', (select id from auth.users limit 1), 'attended');

-- Add additional participants to make events look populated
-- (These will use different user IDs if you have multiple users)
do $$
declare
    user_ids uuid[];
    i integer;
begin
    -- Get up to 5 user IDs
    select array_agg(id) into user_ids from (
        select id from auth.users limit 5
    ) t;
    
    if array_length(user_ids, 1) > 1 then
        -- Add participants for Golden Hour Photowalk
        for i in 2..least(array_length(user_ids, 1), 4) loop
            insert into public.event_participants (event_id, user_id, status) values
            ('550e8400-e29b-41d4-a716-446655440001', user_ids[i], case when i % 3 = 0 then 'maybe' else 'going' end);
        end loop;
        
        -- Add participants for Portrait Masterclass
        for i in 2..least(array_length(user_ids, 1), 3) loop
            insert into public.event_participants (event_id, user_id, status) values
            ('550e8400-e29b-41d4-a716-446655440002', user_ids[i], 'going');
        end loop;
        
        -- Add participants for Night Photography Challenge
        for i in 2..least(array_length(user_ids, 1), 5) loop
            insert into public.event_participants (event_id, user_id, status) values
            ('550e8400-e29b-41d4-a716-446655440003', user_ids[i], case when i % 4 = 0 then 'maybe' else 'going' end);
        end loop;
    end if;
end $$;

-- Note: Event photos will be created when users upload photos through the UI
-- The event_photos table will be populated when users actually upload photos to events

-- Update the past event to have some mock photo data (if photos exist)
-- This is just a placeholder - in reality, photos would be uploaded through the UI
insert into public.event_photos (event_id, photo_id, uploaded_by)
select 
    '550e8400-e29b-41d4-a716-446655440006',
    p.id,
    p.user_id
from public.photos p 
where p.context = 'post' 
limit 3;
