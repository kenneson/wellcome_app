begin;

select plan(4);

select ok(
    exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'avatars_insert_own_folder' and cmd = 'INSERT'
          and roles = array['authenticated']::name[]
    ),
    'avatar uploads require authenticated ownership policy'
);

select ok(
    not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname in ('Anyone can upload an avatar.', 'Anyone can update their own avatar.')
    ),
    'legacy public avatar write policies are absent'
);

select ok(
    exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'kyc_documents_insert_own' and cmd = 'INSERT'
          and roles = array['authenticated']::name[]
    ),
    'KYC evidence is insert-only for authenticated owners'
);

select ok(
    not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname in (
              'Permitir update para testes',
              'Permitir upload para testes',
              'Users can fully manage their own kyc docs'
          )
    ),
    'temporary permissive KYC policies are absent'
);

select * from finish();
rollback;
