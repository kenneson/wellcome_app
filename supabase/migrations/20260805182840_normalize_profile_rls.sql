begin;

alter table public.profiles enable row level security;

do $$
declare
    policy_record record;
begin
    for policy_record in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = 'profiles'
    loop
        execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
    end loop;
end $$;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (
    id, full_name, username, avatar_url, website, occupation, bio,
    dietary_restrictions, looking_for, city, neighborhood, languages,
    phone_number, birth_decade, pets, updated_at
) on public.profiles to authenticated;
grant update (
    full_name, username, avatar_url, website, occupation, bio,
    dietary_restrictions, looking_for, city, neighborhood, languages,
    phone_number, expo_push_token, birth_decade, pets, updated_at
) on public.profiles to authenticated;

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

commit;
