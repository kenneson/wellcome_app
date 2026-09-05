-- Nonpersistent integration verification: fixtures and function live only in this transaction.
begin;
set local statement_timeout = '15s';
create temp table flow_events (id uuid, host_id uuid, title text, event_date timestamptz, max_guests integer, price numeric, requires_approval boolean, access_type text);
create temp table flow_bookings (id uuid, event_id uuid, user_id uuid, status public."RegistrationStatus", payment_due_at timestamptz, capacity_held_at timestamptz, rejection_reason text, created_at timestamptz default now(), updated_at timestamptz);
create temp table flow_payments (booking_id uuid, status text);
create temp table flow_notifications (user_id uuid, type public."NotificationType", title text, body text, data jsonb);
create or replace function pg_temp.reconcile_event_capacity(
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
    from pg_temp.flow_events e
    where e.id = p_event_id
    for update;

    if not found then
        return;
    end if;

    for v_booking in
        update pg_temp.flow_bookings b
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
              select 1 from pg_temp.flow_payments p
              where p.booking_id = b.id
                and p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED')
          )
        returning b.id, b.user_id
    loop
        insert into pg_temp.flow_notifications (user_id, type, title, body, data)
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
    from pg_temp.flow_bookings b
    left join pg_temp.flow_payments p on p.booking_id = b.id
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
                  or p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED')
                  or (
                      v_event.price > 0
                      and b.payment_due_at is not null
                      and b.payment_due_at > p_now
                  )
              )
          )
      );

    v_free_spots := greatest(0, v_event.max_guests - v_occupied);

    for v_slot in 1..v_free_spots loop
        select b.id, b.user_id
        into v_booking
        from pg_temp.flow_bookings b
        where b.event_id = p_event_id
          and b.status = 'WAITLIST'
        order by b.created_at asc, b.id asc
        limit 1
        for update skip locked;

        exit when not found;

        if v_event.price > 0 then
            v_target_status := 'PENDING';
            v_payment_due_at := least(v_event.event_date, p_now + interval '24 hours');
        elsif v_event.requires_approval or v_event.access_type = 'OPEN_WITH_APPROVAL' then
            v_target_status := 'PENDING';
            v_payment_due_at := null;
        else
            v_target_status := 'APPROVED';
            v_payment_due_at := null;
        end if;

        update pg_temp.flow_bookings
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

        insert into pg_temp.flow_notifications (user_id, type, title, body, data)
        values (
            v_booking.user_id,
            'WAITLIST_PROMOTED'::public."NotificationType",
            'Voce avancou na lista de espera',
            case
                when v_target_status = 'APPROVED' then format('Sua vaga em "%s" foi confirmada.', v_event.title)
                when v_payment_due_at is not null then format('Uma vaga abriu em "%s". Pague dentro do prazo para reservar a vaga. A aprovação do anfitrião ainda será necessária quando exigida.', v_event.title)
                else format('Uma vaga abriu em "%s". Sua solicitacao agora aguarda o anfitriao.', v_event.title)
            end,
            jsonb_build_object('eventId', p_event_id, 'bookingId', v_booking.id)
        );

        if v_target_status = 'PENDING' and v_payment_due_at is null then
            insert into pg_temp.flow_notifications (user_id, type, title, body, data)
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



insert into flow_events values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Fixture',now()+interval '3 days',1,100,true,'OPEN_WITH_APPROVAL');
insert into flow_bookings (id,event_id,user_id,status,payment_due_at) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','PENDING',now()-interval '1 hour'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','WAITLIST',null),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','WAITLIST',null);
insert into flow_payments values ('30000000-0000-0000-0000-000000000001','CONFIRMED');
select * from pg_temp.reconcile_event_capacity('10000000-0000-0000-0000-000000000001');
do $test$ begin
 if (select status from flow_bookings where id='30000000-0000-0000-0000-000000000001') <> 'PENDING' then raise exception 'Paid pending booking must not expire'; end if;
 if (select status from flow_bookings where id='30000000-0000-0000-0000-000000000002') <> 'WAITLIST' then raise exception 'Paid pending booking must hold last spot'; end if;
end $test$;
update flow_bookings set status='REJECTED' where id='30000000-0000-0000-0000-000000000001';
select * from pg_temp.reconcile_event_capacity('10000000-0000-0000-0000-000000000001');
do $test$ begin
 if not exists(select 1 from flow_bookings where id='30000000-0000-0000-0000-000000000002' and status='PENDING' and payment_due_at is not null and capacity_held_at is null) then raise exception 'Promoted paid candidate must pay before the reservation is final'; end if;
end $test$;
select * from pg_temp.reconcile_event_capacity('10000000-0000-0000-0000-000000000001');
do $test$ begin
 if (select status from flow_bookings where id='30000000-0000-0000-0000-000000000003') <> 'WAITLIST' then raise exception 'Active checkout window must prevent over-promotion'; end if;
end $test$;
update flow_bookings set payment_due_at=now()-interval '1 hour' where id='30000000-0000-0000-0000-000000000002';
select * from pg_temp.reconcile_event_capacity('10000000-0000-0000-0000-000000000001');
do $test$ begin
 if (select status from flow_bookings where id='30000000-0000-0000-0000-000000000002') <> 'EXPIRED' then raise exception 'Unpaid candidate must expire'; end if;
end $test$;
select 'PASS: paid reservation, rejection releases capacity, checkout hold prevents over-promotion, unpaid expiry' as verification;
rollback;
