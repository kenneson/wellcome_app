alter type public."PaymentStatus" add value if not exists 'PARTIALLY_REFUNDED';
alter type public."PaymentStatus" add value if not exists 'CHARGEBACK';
alter type public."TransactionType" add value if not exists 'DEBIT_PAYMENT_REVERSAL';

alter table public.payments
    add column if not exists provider text not null default 'EFI',
    add column if not exists checkout_url text,
    add column if not exists provider_payment_id text,
    add column if not exists payment_method text,
    add column if not exists provider_status text,
    add column if not exists processor_fee numeric(10, 2) not null default 0,
    add column if not exists refunded_amount numeric(10, 2) not null default 0,
    add column if not exists refunded_net_amount numeric(10, 2) not null default 0;

create unique index if not exists payments_provider_payment_id_key
    on public.payments (provider_payment_id)
    where provider_payment_id is not null;

alter table public.withdrawal_requests
    add column if not exists provider text not null default 'EFI',
    add column if not exists provider_transfer_id text,
    add column if not exists provider_end_to_end_id text;

create unique index if not exists withdrawal_requests_provider_transfer_id_key
    on public.withdrawal_requests (provider_transfer_id)
    where provider_transfer_id is not null;

create table if not exists public.payment_webhook_events (
    id text primary key,
    provider text not null,
    event_type text not null,
    payload jsonb not null,
    status text not null default 'PROCESSING'
        check (status in ('PROCESSING', 'PROCESSED', 'FAILED')),
    attempts integer not null default 1 check (attempts > 0),
    error text,
    processed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_payment_webhook_events_provider_type
    on public.payment_webhook_events (provider, event_type);

create index if not exists idx_payment_webhook_events_status_created
    on public.payment_webhook_events (status, created_at);

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon, authenticated;
