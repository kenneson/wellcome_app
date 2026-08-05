begin;

alter table public.events
    add column if not exists city text,
    add column if not exists state text,
    add column if not exists is_served_in_sequence boolean not null default false,
    add column if not exists creation_key text;

create unique index if not exists events_creation_key_key
    on public.events (creation_key)
    where creation_key is not null;

with parsed_locations as (
    select
        id,
        regexp_match(location, '([^,]+?)[[:space:]]*-[[:space:]]*([A-Z]{2})(?:[[:space:]]*,|$)') as parts
    from public.events
    where city is null or state is null
)
update public.events as events
set
    city = coalesce(events.city, nullif(trim(parsed_locations.parts[1]), '')),
    state = coalesce(events.state, nullif(trim(parsed_locations.parts[2]), ''))
from parsed_locations
where events.id = parsed_locations.id
  and parsed_locations.parts is not null;

create table if not exists public.event_drafts (
    id uuid primary key default gen_random_uuid(),
    host_id uuid not null references public.profiles(id) on delete cascade,
    payload jsonb not null default '{}'::jsonb,
    current_step integer not null default 0 check (current_step between 0 and 4),
    schema_version integer not null default 1,
    revision integer not null default 0,
    publish_key text,
    published_event_id uuid references public.events(id) on delete set null,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_event_drafts_host_updated
    on public.event_drafts (host_id, updated_at desc);

alter table public.event_drafts enable row level security;
revoke all on public.event_drafts from anon, authenticated;
grant select, insert, update, delete on public.event_drafts to authenticated;

drop policy if exists "event_drafts_select_own" on public.event_drafts;
drop policy if exists "event_drafts_insert_own" on public.event_drafts;
drop policy if exists "event_drafts_update_own" on public.event_drafts;
drop policy if exists "event_drafts_delete_own" on public.event_drafts;

create policy "event_drafts_select_own"
on public.event_drafts for select to authenticated
using ((select auth.uid()) = host_id);

create policy "event_drafts_insert_own"
on public.event_drafts for insert to authenticated
with check ((select auth.uid()) = host_id);

create policy "event_drafts_update_own"
on public.event_drafts for update to authenticated
using ((select auth.uid()) = host_id)
with check ((select auth.uid()) = host_id);

create policy "event_drafts_delete_own"
on public.event_drafts for delete to authenticated
using ((select auth.uid()) = host_id);

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

drop policy if exists "event_images_select_public" on storage.objects;
drop policy if exists "event_images_insert_own_folder" on storage.objects;
drop policy if exists "event_images_update_own_folder" on storage.objects;
drop policy if exists "event_images_delete_own_folder" on storage.objects;

create policy "event_images_select_public"
on storage.objects for select
using (bucket_id = 'event-images');

create policy "event_images_insert_own_folder"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "event_images_update_own_folder"
on storage.objects for update to authenticated
using (bucket_id = 'event-images' and owner_id = (select auth.uid()::text))
with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "event_images_delete_own_folder"
on storage.objects for delete to authenticated
using (bucket_id = 'event-images' and owner_id = (select auth.uid()::text));

commit;
