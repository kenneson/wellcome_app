begin;

select plan(14);

select ok(not has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated cannot select profiles directly');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'authenticated cannot insert profiles directly');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'authenticated cannot update profiles directly');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'DELETE'), 'authenticated cannot delete profiles directly');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot select profiles directly');

select ok(has_table_privilege('authenticated', 'public.events', 'SELECT'), 'authenticated can read owned events');
select ok(not has_table_privilege('anon', 'public.events', 'SELECT'), 'anon cannot read events directly');
select ok(not has_table_privilege('authenticated', 'public.events', 'UPDATE'), 'authenticated cannot update events directly');

select ok(has_table_privilege('authenticated', 'public.event_participants', 'SELECT'), 'authenticated can read authorized registrations');
select ok(not has_table_privilege('anon', 'public.event_participants', 'SELECT'), 'anon cannot read registrations directly');
select ok(not has_table_privilege('authenticated', 'public.event_participants', 'UPDATE'), 'authenticated cannot update registrations directly');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.events'::regclass), 'events has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.event_participants'::regclass), 'event_participants has RLS enabled');

select * from finish();
rollback;
