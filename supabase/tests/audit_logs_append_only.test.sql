-- Nonpersistent verification of public.audit_logs: run after the migrations, everything rolls back.
begin;
set local statement_timeout = '15s';

insert into public.audit_logs (action, outcome, actor_id, metadata)
values ('withdrawal.request', 'success', gen_random_uuid(), '{"amount": 50}');

do $$
begin
    begin
        update public.audit_logs set outcome = 'denied';
        raise exception 'update on audit_logs should have failed';
    exception when raise_exception then
        if sqlerrm <> 'audit_logs is append-only' then raise; end if;
    end;

    begin
        delete from public.audit_logs;
        raise exception 'delete on audit_logs should have failed';
    exception when raise_exception then
        if sqlerrm <> 'audit_logs is append-only' then raise; end if;
    end;

    begin
        insert into public.audit_logs (action, outcome) values ('x', 'bogus');
        raise exception 'invalid outcome should have failed';
    exception when check_violation then
        null;
    end;

    if has_table_privilege('anon', 'public.audit_logs', 'select')
        or has_table_privilege('authenticated', 'public.audit_logs', 'select')
        or has_table_privilege('authenticated', 'public.audit_logs', 'insert') then
        raise exception 'clients must not access audit_logs';
    end if;
end
$$;

rollback;
