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

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

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

