
-- Create events table
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  host_id uuid references profiles(id) not null,
  title text not null,
  description text,
  event_date timestamp with time zone not null,
  location text not null,
  latitude float,
  longitude float,
  max_guests integer default 0,
  cover_image_url text
);

-- RLS for events
alter table events enable row level security;

-- Policies (Drop first to avoid errors if re-running)
drop policy if exists "Events are viewable by everyone." on events;
create policy "Events are viewable by everyone." on events
  for select using (true);
  
drop policy if exists "Users can create events." on events;
create policy "Users can create events." on events
  for insert with check (auth.uid() = host_id);

drop policy if exists "Hosts can update their own events." on events;
create policy "Hosts can update their own events." on events
  for update using (auth.uid() = host_id);

drop policy if exists "Hosts can delete their own events." on events;
create policy "Hosts can delete their own events." on events
  for delete using (auth.uid() = host_id);

-- Function to search events by distance (Haversine formula)
create or replace function get_events_nearby(
  lat float,
  long float,
  radius_km float default 60
)
returns setof events
language sql
as $$
  select *
  from events
  where 
    event_date >= now()
    and (
      6371 * acos(
        cos(radians(lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(long)) +
        sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= radius_km
  order by event_date;
$$;


-- Create event participants table
create table if not exists event_participants (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_id uuid references events(id) not null,
  user_id uuid references profiles(id) not null,
  status text default 'confirmed', -- 'confirmed', 'pending', 'cancelled'
  
  unique(event_id, user_id)
);

-- RLS for participants
alter table event_participants enable row level security;

drop policy if exists "Participants are viewable by everyone" on event_participants;
create policy "Participants are viewable by everyone" on event_participants
  for select using (true);

drop policy if exists "Users can join events." on event_participants;
create policy "Users can join events." on event_participants
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can leave events." on event_participants;
create policy "Users can leave events." on event_participants
  for delete using (auth.uid() = user_id);
