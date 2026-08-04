begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create table private.billing_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.profiles(id) on delete cascade,
    asaas_customer_id text unique,
    full_name text not null,
    cpf_cnpj text not null,
    email text not null,
    mobile_phone text not null,
    postal_code text,
    address_number text,
    address_complement text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint billing_profiles_cpf_format check (cpf_cnpj ~ '^[0-9]{11,14}$'),
    constraint billing_profiles_phone_format check (mobile_phone ~ '^[0-9]{10,13}$'),
    constraint billing_profiles_postal_code_format check (postal_code is null or postal_code ~ '^[0-9]{8}$')
);

create table private.payment_cards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    billing_profile_id uuid not null references private.billing_profiles(id) on delete cascade,
    provider text not null default 'ASAAS',
    provider_token text not null unique,
    brand text not null,
    last_four text not null,
    holder_name text not null,
    expiry_month integer not null,
    expiry_year integer not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint payment_cards_last_four_format check (last_four ~ '^[0-9]{4}$'),
    constraint payment_cards_expiry_month_range check (expiry_month between 1 and 12),
    constraint payment_cards_expiry_year_range check (expiry_year between 2020 and 2200)
);

create index idx_payment_cards_user_created
    on private.payment_cards (user_id, created_at);

create unique index payment_cards_one_default_per_user
    on private.payment_cards (user_id)
    where is_default;

alter table private.billing_profiles enable row level security;
alter table private.payment_cards enable row level security;

revoke all on private.billing_profiles, private.payment_cards from public, anon, authenticated, service_role;

alter table public.payments
    add column if not exists pix_expiration_date timestamptz;

comment on schema private is 'Backend-only data not exposed through the Supabase Data API';
comment on column private.payment_cards.provider_token is 'Provider token only; PAN and CVV are never stored';

commit;
