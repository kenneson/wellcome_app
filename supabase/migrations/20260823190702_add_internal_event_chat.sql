create type public."ChatMessageKind" as enum ('USER', 'SYSTEM');

alter type public."NotificationType" add value if not exists 'CHAT_MESSAGE';

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  host_id uuid not null references public.profiles(id) on delete restrict,
  guest_id uuid not null references public.profiles(id) on delete restrict,
  booking_id uuid references public.event_participants(id) on delete set null,
  last_message_at timestamptz not null default now(),
  host_last_read_at timestamptz,
  guest_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_conversations_event_guest_unique unique (event_id, guest_id),
  constraint chat_conversations_booking_unique unique (booking_id),
  constraint chat_conversations_distinct_participants check (host_id <> guest_id)
);

create index idx_chat_conversations_host_last_message
  on public.chat_conversations (host_id, last_message_at desc);
create index idx_chat_conversations_guest_last_message
  on public.chat_conversations (guest_id, last_message_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public."ChatMessageKind" not null default 'USER',
  body text not null,
  metadata jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint chat_messages_sender_kind check (
    (kind = 'SYSTEM' and sender_id is null) or
    (kind = 'USER' and sender_id is not null)
  )
);

create index idx_chat_messages_conversation_created
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on table public.chat_conversations from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;

comment on table public.chat_conversations is
  'Event-scoped private conversations. Access is mediated by the authenticated backend.';
comment on table public.chat_messages is
  'Immutable chat history used for participant support and dispute review.';
