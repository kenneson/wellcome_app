begin;

alter table public.withdrawal_requests
    add column if not exists provider_status text,
    add column if not exists approved_by_admin_id uuid,
    add column if not exists submission_attempts integer not null default 0,
    add column if not exists failure_reason text,
    add column if not exists approved_at timestamptz,
    add column if not exists submitted_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists failed_at timestamptz,
    add column if not exists last_reconciled_at timestamptz;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'withdrawal_requests_approved_by_admin_id_fkey'
    ) then
        alter table public.withdrawal_requests
            add constraint withdrawal_requests_approved_by_admin_id_fkey
            foreign key (approved_by_admin_id)
            references public.profiles(id)
            on delete set null;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'withdrawal_requests_positive_amount_check'
    ) then
        alter table public.withdrawal_requests
            add constraint withdrawal_requests_positive_amount_check
            check (amount > 0);
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'withdrawal_requests_submission_attempts_check'
    ) then
        alter table public.withdrawal_requests
            add constraint withdrawal_requests_submission_attempts_check
            check (submission_attempts >= 0);
    end if;
end $$;

create index if not exists idx_withdrawals_status_created
    on public.withdrawal_requests (status, created_at);

alter table public.withdrawal_requests enable row level security;
revoke all on public.withdrawal_requests from anon, authenticated;

commit;
