begin;

-- Profile reads and writes now go through the authenticated backend API.
-- The auth trigger, Prisma backend and verify-kyc service role are unaffected.
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

comment on table public.profiles is
    'Private profile data. Mobile clients use the authenticated backend API; direct Data API access is disabled.';

-- The host dashboard still reads only the signed-in host's events and the
-- registrations belonging to the guest or to an event owned by the host.
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

revoke all on table public.events, public.event_participants from anon, authenticated;
grant select on table public.events, public.event_participants to authenticated;

drop policy if exists "events_select_host" on public.events;
create policy "events_select_host"
on public.events for select to authenticated
using ((select auth.uid()) = host_id);

drop policy if exists "event_participants_select_owner_or_host" on public.event_participants;
create policy "event_participants_select_owner_or_host"
on public.event_participants for select to authenticated
using (
    (select auth.uid()) = user_id
    or exists (
        select 1
        from public.events
        where events.id = event_participants.event_id
          and events.host_id = (select auth.uid())
    )
);

-- RLS predicates are backed by indexes so authorization checks remain cheap.
create index if not exists idx_events_host_id on public.events (host_id);
create index if not exists idx_event_participants_user_id on public.event_participants (user_id);
create index if not exists idx_event_participants_event_id on public.event_participants (event_id);

-- Remove legacy public write policies. Anonymous clients must never upload or
-- replace identity images or KYC evidence.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update their own avatar." on storage.objects;
drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_insert_own_folder" on storage.objects;
drop policy if exists "avatars_update_own_folder" on storage.objects;
drop policy if exists "avatars_delete_own_folder" on storage.objects;

create policy "avatars_select_public"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "avatars_update_own_folder"
on storage.objects for update to authenticated
using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
)
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "avatars_delete_own_folder"
on storage.objects for delete to authenticated
using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
);

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Permitir update para testes" on storage.objects;
drop policy if exists "Permitir upload para testes" on storage.objects;
drop policy if exists "Users can fully manage their own kyc docs" on storage.objects;
drop policy if exists "kyc_documents_select_own" on storage.objects;
drop policy if exists "kyc_documents_insert_own" on storage.objects;
drop policy if exists "kyc_documents_update_own" on storage.objects;

-- Every attempt receives a new submission folder. Evidence is insert-only so
-- a participant cannot replace files after they have been submitted.
create policy "kyc_documents_insert_own"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] is not null
    and storage.filename(name) in ('document.jpg', 'selfie.jpg')
);

commit;
