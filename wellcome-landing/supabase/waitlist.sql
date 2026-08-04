create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  intent text not null check (intent in ('DISCOVER', 'HOST', 'BOTH')),
  source text not null default 'wellcome-landing',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_lower_key
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;
