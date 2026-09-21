alter table public.events
    add column if not exists cancelled_at timestamptz,
    add column if not exists cancellation_reason text,
    add column if not exists cancellation_fee_total numeric(10, 2) not null default 0,
    add column if not exists cancellation_payment_count integer not null default 0;

alter table public.event_participants
    add column if not exists cancellation_source text,
    add column if not exists cancellation_penalty_rate numeric(5, 2);

alter table public.payments
    add column if not exists refund_target_amount numeric(10, 2),
    add column if not exists refund_reason text,
    add column if not exists refund_completed_at timestamptz;

alter type public."TransactionType"
    add value if not exists 'DEBIT_EVENT_CANCELLATION_FEE';

create index if not exists idx_payments_pending_policy_refunds
on public.payments (updated_at, booking_id)
where refund_target_amount is not null
  and refund_completed_at is null
  and provider = 'ASAAS'
  and provider_payment_id is not null;

create index if not exists idx_events_active_date
on public.events (event_date)
where cancelled_at is null;

comment on column public.payments.refund_target_amount is
    'Cumulative gross refund target. Full for host/rejection cancellation and 50 percent for participant cancellation.';
comment on column public.event_participants.cancellation_source is
    'Cancellation actor: PARTICIPANT or HOST.';
