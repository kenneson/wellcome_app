begin;

alter table public._prisma_migrations enable row level security;
alter table public.event_dishes enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_questions enable row level security;
alter table public.event_reviews enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;
alter table public.push_tokens enable row level security;
alter table public.registration_answers enable row level security;
alter table public.registration_notes enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.withdrawal_requests enable row level security;

revoke all on public._prisma_migrations,
    public.event_dishes,
    public.event_participants,
    public.event_questions,
    public.event_reviews,
    public.events,
    public.notifications,
    public.payments,
    public.push_tokens,
    public.registration_answers,
    public.registration_notes,
    public.wallet_transactions,
    public.withdrawal_requests
from anon, authenticated;

grant select on public.events, public.event_participants to authenticated;

drop policy if exists "events_select_host" on public.events;
create policy "events_select_host"
on public.events for select to authenticated
using ((select auth.uid()) = host_id);

drop policy if exists "event_participants_select_owner_or_host" on public.event_participants;
create policy "event_participants_select_owner_or_host"
on public.event_participants for select to authenticated
using (
    (select auth.uid()) = user_id
    or exists (
        select 1
        from public.events
        where events.id = event_participants.event_id
          and events.host_id = (select auth.uid())
    )
);

alter function public.get_events_nearby(double precision, double precision, integer)
    set search_path = public, pg_temp;
alter function public.get_events_nearby(double precision, double precision, double precision)
    set search_path = public, pg_temp;

commit;
