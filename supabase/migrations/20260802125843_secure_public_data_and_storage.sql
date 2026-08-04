begin;

-- The mobile app reads public event data through the API. The Data API only
-- needs to expose a user's own profile and events they host.
alter table if exists public.profiles enable row level security;
alter table if exists public.events enable row level security;
alter table if exists public.event_participants enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.wallet_transactions enable row level security;
alter table if exists public.withdrawal_requests enable row level security;
alter table if exists public.registration_answers enable row level security;
alter table if exists public.registration_notes enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.push_tokens enable row level security;

do $$
declare
    policy_record record;
begin
    for policy_record in
        select policyname, tablename
        from pg_policies
        where schemaname = 'public'
          and tablename in ('profiles', 'events', 'event_participants')
    loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
    end loop;
end $$;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, username, avatar_url, website, occupation, bio, dietary_restrictions, looking_for, city, neighborhood, languages, phone_number, birth_decade, pets, updated_at) on public.profiles to authenticated;
grant update (full_name, username, avatar_url, website, occupation, bio, dietary_restrictions, looking_for, city, neighborhood, languages, phone_number, expo_push_token, birth_decade, pets, updated_at) on public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;

create policy "events_select_host"
on public.events for select to authenticated
using ((select auth.uid()) = host_id);

revoke all on public.event_participants from anon, authenticated;
grant select on public.event_participants to authenticated;

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

revoke all on public.bookings, public.payments, public.wallet_transactions,
    public.withdrawal_requests, public.registration_answers,
    public.registration_notes, public.notifications, public.push_tokens
from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update their own avatar." on storage.objects;
drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_insert_own_folder" on storage.objects;
drop policy if exists "avatars_update_own_folder" on storage.objects;
drop policy if exists "avatars_delete_own_folder" on storage.objects;
drop policy if exists "kyc_documents_select_own" on storage.objects;
drop policy if exists "kyc_documents_insert_own" on storage.objects;
drop policy if exists "kyc_documents_update_own" on storage.objects;

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

create policy "kyc_documents_select_own"
on storage.objects for select to authenticated
using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "kyc_documents_insert_own"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and storage.filename(name) in ('document.jpg', 'selfie.jpg')
);

create policy "kyc_documents_update_own"
on storage.objects for update to authenticated
using (
    bucket_id = 'kyc-documents'
    and owner_id = (select auth.uid()::text)
)
with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and storage.filename(name) in ('document.jpg', 'selfie.jpg')
);

commit;
