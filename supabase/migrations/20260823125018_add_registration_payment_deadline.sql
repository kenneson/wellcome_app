alter table public.event_participants
    add column if not exists payment_due_at timestamptz;

create index if not exists idx_event_participants_payment_due
    on public.event_participants (payment_due_at, id)
    where status = 'APPROVED' and payment_due_at is not null;

comment on column public.event_participants.payment_due_at is
    'Deadline for an approved participant to initiate payment before the spot may be released.';
