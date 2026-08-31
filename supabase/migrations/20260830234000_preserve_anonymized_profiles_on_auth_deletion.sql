begin;

-- Account deletion removes the Auth identity while retaining an anonymized
-- application profile so event and financial history keep referential integrity.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select constraint_row.conname
    from pg_constraint as constraint_row
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = 'public.profiles'::regclass
      and constraint_row.confrelid = 'auth.users'::regclass
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      constraint_name
    );
  end loop;
end;
$$;

comment on table public.profiles is
  'Application profiles. Rows may remain anonymized after the related Auth identity is deleted.';

commit;
