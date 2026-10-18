-- Append-only audit trail for sensitive operations (KYC, withdrawals, ticket
-- validation, balance reconciliation). Written only by the backend and Edge
-- Functions with service credentials; clients can neither read nor write it.
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    action text not null,
    outcome text not null,
    actor_id uuid,
    actor_role text,
    target_type text,
    target_id text,
    status_code integer,
    ip text,
    request_id text,
    metadata jsonb not null default '{}'::jsonb,
    constraint audit_logs_outcome_valid
        check (outcome in ('success', 'denied', 'rejected', 'rate_limited', 'error'))
);

create index if not exists idx_audit_logs_actor_action_created
    on public.audit_logs (actor_id, action, created_at desc);
create index if not exists idx_audit_logs_action_created
    on public.audit_logs (action, created_at desc);
create index if not exists idx_audit_logs_target
    on public.audit_logs (target_type, target_id, created_at desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
    before update or delete on public.audit_logs
    for each row execute function public.prevent_audit_log_mutation();

comment on table public.audit_logs is
    'Append-only audit trail of sensitive operations. Service role only.';
comment on column public.audit_logs.metadata is
    'Small structured context (amounts, statuses). Never documents, tokens or card data.';
