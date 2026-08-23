begin;

-- Reassert column-level privileges so authenticated clients cannot change
-- wallet, role, KYC decision, payout or other server-owned fields.
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

-- Every KYC attempt uses a new submission folder. Objects are insert-only so
-- evidence already reviewed by the function/admin cannot be replaced later.
drop policy if exists "kyc_documents_insert_own" on storage.objects;
drop policy if exists "kyc_documents_update_own" on storage.objects;

create policy "kyc_documents_insert_own"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] is not null
    and storage.filename(name) in ('document.jpg', 'selfie.jpg')
);

commit;
