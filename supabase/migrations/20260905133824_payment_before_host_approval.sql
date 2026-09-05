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
        from public.event_participants b
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
                when v_payment_due_at is not null then format('Uma vaga abriu em "%s". Pague dentro do prazo para reservar a vaga. A aprovação do anfitrião ainda será necessária quando exigida.', v_event.title)
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


-- Paid candidates retain capacity while the host decides, without payment expiry.
update public.event_participants b
set capacity_held_at = coalesce(b.capacity_held_at, now()), payment_due_at = null
where b.status = 'PENDING'
  and exists (select 1 from public.payments p where p.booking_id = b.id and p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED'));

-- Existing unpaid moderated candidates can now pay without waiting for approval.
update public.event_participants b
set payment_due_at = least(e.event_date, now() + interval '24 hours'),
    capacity_held_at = null
from public.events e
where b.event_id = e.id and e.price > 0 and e.event_date > now()
  and b.status = 'PENDING' and b.payment_due_at is null
  and not exists (select 1 from public.payments p where p.booking_id = b.id and p.status in ('CONFIRMED', 'PARTIALLY_REFUNDED'));

revoke all on function private.reconcile_event_capacity(uuid, timestamptz) from public, anon, authenticated;
grant execute on function private.reconcile_event_capacity(uuid, timestamptz) to service_role;

create index if not exists idx_payments_registration_refunds
on public.payments (updated_at, booking_id)
where provider = 'ASAAS' and status in ('CONFIRMED', 'PARTIALLY_REFUNDED') and provider_payment_id is not null;
