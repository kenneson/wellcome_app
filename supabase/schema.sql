-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  username text unique,
  avatar_url text,
  website text,
  occupation text,
  bio text,
  dietary_restrictions text[], -- Array of strings for multiple restrictions
  looking_for text CHECK (looking_for IN ('comer', 'cozinhar', 'ambos')),

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Users can view their own profile." on profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a storage bucket for avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "Anyone can update their own avatar." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'avatars');


-- Create events table
create table events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  host_id uuid references profiles(id) not null,
  title text not null,
  description text,
  event_date timestamp with time zone not null,
  location text not null,
  max_guests integer default 0,
  cover_image_url text
);

-- RLS for events
alter table events enable row level security;

create policy "Hosts can view their own events." on events
  for select using (auth.uid() = host_id);

create policy "Users can create events." on events
  for insert with check (auth.uid() = host_id);

create policy "Hosts can update their own events." on events
  for update using (auth.uid() = host_id);

create policy "Hosts can delete their own events." on events
  for delete using (auth.uid() = host_id);


-- Create event participants table
create table event_participants (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_id uuid references events(id) not null,
  user_id uuid references profiles(id) not null,
  status text default 'confirmed', -- 'confirmed', 'pending', 'cancelled'
  
  unique(event_id, user_id)
);

-- RLS for participants
alter table event_participants enable row level security;

create policy "Participants can view their own registration or hosted event registrations" on event_participants
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from events
      where events.id = event_participants.event_id
        and events.host_id = auth.uid()
    )
  );

create policy "Users can join events." on event_participants
  for insert with check (auth.uid() = user_id);

create policy "Users can leave events." on event_participants
  for delete using (auth.uid() = user_id);
