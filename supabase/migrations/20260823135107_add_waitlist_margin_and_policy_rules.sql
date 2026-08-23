alter table public.payments
    add column if not exists processor_fee_payer text not null default 'PLATFORM',
    add column if not exists platform_margin numeric(10, 2) not null default 0,
    add column if not exists refunded_platform_fee numeric(10, 2) not null default 0,
    add column if not exists refunded_processor_fee numeric(10, 2) not null default 0;

alter table public.event_participants
    add column if not exists capacity_held_at timestamptz;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'payments_processor_fee_payer_valid'
          and conrelid = 'public.payments'::regclass
    ) then
        alter table public.payments
            add constraint payments_processor_fee_payer_valid
            check (processor_fee_payer in ('PLATFORM', 'HOST'));
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'payments_refunded_platform_fee_valid'
          and conrelid = 'public.payments'::regclass
    ) then
        alter table public.payments
            add constraint payments_refunded_platform_fee_valid
            check (refunded_platform_fee >= 0 and refunded_platform_fee <= coalesce(platform_fee, 0));
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'payments_refunded_processor_fee_valid'
          and conrelid = 'public.payments'::regclass
    ) then
        alter table public.payments
            add constraint payments_refunded_processor_fee_valid
            check (refunded_processor_fee >= 0 and refunded_processor_fee <= processor_fee);
    end if;
end
$$;

create index if not exists idx_event_participants_waitlist_fifo
    on public.event_participants (event_id, created_at, id)
    where status = 'WAITLIST';

create index if not exists idx_event_participants_expiring_capacity
    on public.event_participants (payment_due_at, event_id, id)
    where status in ('PENDING', 'APPROVED') and payment_due_at is not null;

create index if not exists idx_payments_event_paid_at
    on public.payments (event_id, paid_at, id)
    where status in ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CHARGEBACK');

create schema if not exists private;

create or replace function private.reconcile_event_capacity(
    p_event_id uuid,
    p_now timestamptz default now()
)
returns table (action text, booking_id uuid, user_id uuid, new_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_event record;
    v_booking record;
    v_occupied integer := 0;
    v_free_spots integer := 0;
    v_target_status text;
    v_payment_due_at timestamptz;
    v_slot integer;
begin
    select
        e.id,
        e.host_id,
        e.title,
        e.event_date,
        e.max_guests,
        coalesce(e.price, 0) as price,
        e.requires_approval,
        e.access_type
    into v_event
    from public.events e
    where e.id = p_event_id
    for update;

    if not found then
        return;
    end if;

    for v_booking in
        update public.event_participants b
        set
            status = 'EXPIRED'::public."RegistrationStatus",
            payment_due_at = null,
            capacity_held_at = null,
            rejection_reason = 'Prazo de pagamento expirado',
            updated_at = p_now
        where b.event_id = p_event_id
          and b.status in ('PENDING', 'APPROVED')
          and b.payment_due_at is not null
          and b.payment_due_at <= p_now
          and not exists (
              select 1 from public.payments p
              where p.booking_id = b.id
                and p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED')
          )
        returning b.id, b.user_id
    loop
        insert into public.notifications (user_id, type, title, body, data)
        values (
            v_booking.user_id,
            'REGISTRATION_EXPIRED'::public."NotificationType",
            'Prazo de pagamento expirado',
            format('O prazo para confirmar sua vaga em "%s" terminou.', v_event.title),
            jsonb_build_object('eventId', p_event_id, 'bookingId', v_booking.id)
        );

        action := 'EXPIRED';
        booking_id := v_booking.id;
        user_id := v_booking.user_id;
        new_status := 'EXPIRED';
        return next;
    end loop;

    if coalesce(v_event.max_guests, 0) <= 0 or v_event.event_date <= p_now then
        return;
    end if;

    select count(distinct b.id)::integer
    into v_occupied
    from public.event_participants b
    left join public.payments p on p.booking_id = b.id
    where b.event_id = p_event_id
      and (
          (
              b.status = 'APPROVED'
              and (
                  v_event.price <= 0
                  or p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED')
                  or b.payment_due_at is null
                  or b.payment_due_at > p_now
              )
          )
          or (
              b.status = 'PENDING'
              and (
                  b.capacity_held_at is not null
                  or (
                      v_event.price > 0
                      and not (v_event.requires_approval or v_event.access_type = 'OPEN_WITH_APPROVAL')
                      and (b.payment_due_at is null or b.payment_due_at > p_now)
                  )
              )
          )
      );

    v_free_spots := greatest(0, v_event.max_guests - v_occupied);

    for v_slot in 1..v_free_spots loop
        select b.id, b.user_id
        into v_booking
        from public.event_participants b
        where b.event_id = p_event_id
          and b.status = 'WAITLIST'
        order by b.created_at asc, b.id asc
        limit 1
        for update skip locked;

        exit when not found;

        if v_event.requires_approval or v_event.access_type = 'OPEN_WITH_APPROVAL' then
            v_target_status := 'PENDING';
            v_payment_due_at := null;
        elsif v_event.price > 0 then
            v_target_status := 'PENDING';
            v_payment_due_at := least(v_event.event_date, p_now + interval '24 hours');
        else
            v_target_status := 'APPROVED';
            v_payment_due_at := null;
        end if;

        update public.event_participants
        set
            status = v_target_status::public."RegistrationStatus",
            payment_due_at = v_payment_due_at,
            capacity_held_at = case
                when v_target_status = 'PENDING' and v_payment_due_at is null then p_now
                else null
            end,
            rejection_reason = null,
            updated_at = p_now
        where id = v_booking.id;

        insert into public.notifications (user_id, type, title, body, data)
        values (
            v_booking.user_id,
            'WAITLIST_PROMOTED'::public."NotificationType",
            'Voce avancou na lista de espera',
            case
                when v_target_status = 'APPROVED' then format('Sua vaga em "%s" foi confirmada.', v_event.title)
                when v_payment_due_at is not null then format('Uma vaga abriu em "%s". Pague dentro do prazo para confirmar.', v_event.title)
                else format('Uma vaga abriu em "%s". Sua solicitacao agora aguarda o anfitriao.', v_event.title)
            end,
            jsonb_build_object('eventId', p_event_id, 'bookingId', v_booking.id)
        );

        if v_target_status = 'PENDING' and v_payment_due_at is null then
            insert into public.notifications (user_id, type, title, body, data)
            values (
                v_event.host_id,
                'NEW_REGISTRATION_PENDING'::public."NotificationType",
                'Pessoa promovida da lista de espera',
                format('Uma pessoa da fila de "%s" agora aguarda sua analise.', v_event.title),
                jsonb_build_object('eventId', p_event_id, 'bookingId', v_booking.id)
            );
        end if;

        action := 'PROMOTED';
        booking_id := v_booking.id;
        user_id := v_booking.user_id;
        new_status := v_target_status;
        return next;
    end loop;
end;
$$;

create or replace function private.reconcile_all_event_capacities()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_event_id uuid;
    v_processed integer := 0;
begin
    for v_event_id in
        select distinct e.id
        from public.events e
        where e.event_date > now()
          and (
              exists (
                  select 1 from public.event_participants b
                  where b.event_id = e.id
                    and b.status in ('PENDING', 'APPROVED')
                    and b.payment_due_at is not null
                    and b.payment_due_at <= now()
              )
              or exists (
                  select 1 from public.event_participants b
                  where b.event_id = e.id and b.status = 'WAITLIST'
              )
          )
        order by e.id
    loop
        perform private.reconcile_event_capacity(v_event_id, now());
        v_processed := v_processed + 1;
    end loop;

    return v_processed;
end;
$$;

revoke all on function private.reconcile_event_capacity(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.reconcile_all_event_capacities() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.reconcile_event_capacity(uuid, timestamptz) to service_role;
grant execute on function private.reconcile_all_event_capacities() to service_role;

create extension if not exists pg_cron;

do $$
declare
    v_job_id bigint;
begin
    select jobid into v_job_id from cron.job where jobname = 'reconcile-event-capacities';
    if v_job_id is not null then
        perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
        'reconcile-event-capacities',
        '* * * * *',
        'select private.reconcile_all_event_capacities();'
    );
end
$$;

comment on column public.payments.processor_fee_payer is
    'Party that absorbed the processor fee when the payment settled: PLATFORM or HOST.';
comment on column public.payments.platform_margin is
    'Platform fee minus processor cost paid by the platform at settlement time.';
comment on column public.payments.refunded_platform_fee is
    'Cumulative platform fee reversed proportionally with refunds.';
comment on column public.payments.refunded_processor_fee is
    'Processor fee returned by the provider, when confirmed by the payment method rules.';
