alter table public.profiles
    add column if not exists pending_wallet_balance numeric(10, 2) not null default 0;

alter table public.payments
    add column if not exists funds_held_at timestamptz,
    add column if not exists funds_available_at timestamptz,
    add column if not exists funds_released_at timestamptz;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_pending_wallet_balance_nonnegative'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_pending_wallet_balance_nonnegative
            check (pending_wallet_balance >= 0);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'payments_funds_lifecycle_valid'
          and conrelid = 'public.payments'::regclass
    ) then
        alter table public.payments
            add constraint payments_funds_lifecycle_valid
            check (
                (funds_held_at is null and funds_available_at is null and funds_released_at is null)
                or
                (funds_held_at is not null and funds_available_at is not null)
            );
    end if;
end
$$;

create index if not exists idx_payments_funds_release
    on public.payments (funds_available_at, id)
    where funds_held_at is not null and funds_released_at is null;

comment on column public.profiles.pending_wallet_balance is
    'Net host funds held until the event settlement window ends.';
comment on column public.payments.funds_available_at is
    'Earliest instant when the net host funds may become withdrawable.';
