-- Portfolio Website Generator schema for Supabase PostgreSQL.
-- Backend uses the server-only service-role key and enforces ownership in Express.
-- RLS is enabled as defense in depth; never expose the service-role key to the browser.
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null check (char_length(trim(name)) >= 2),
  email varchar(254) not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  display_name varchar(100) not null default '',
  headline varchar(140) not null default '',
  bio varchar(1000) not null default '',
  location varchar(100) not null default '',
  contact_email varchar(254) not null default '',
  education varchar(180) not null default '',
  skills text[] not null default '{}',
  slug varchar(40) unique,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_slug check (slug is null or slug ~ '^[a-f0-9]{18}$'),
  constraint skills_limit check (cardinality(skills) <= 30)
);

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  title varchar(120) not null check (char_length(trim(title)) > 0),
  description varchar(500) not null default '',
  url text,
  position smallint not null default 0 check (position between 0 and 7),
  created_at timestamptz not null default now(),
  unique (portfolio_id, position)
);

create index if not exists idx_portfolios_user_id on public.portfolios(user_id);
create index if not exists idx_portfolios_published_slug on public.portfolios(slug) where is_published = true;
create index if not exists idx_portfolio_projects_portfolio_position on public.portfolio_projects(portfolio_id, position);
create index if not exists idx_app_users_email_lower on public.app_users(lower(email));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at before update on public.app_users
for each row execute function public.set_updated_at();
drop trigger if exists portfolios_updated_at on public.portfolios;
create trigger portfolios_updated_at before update on public.portfolios
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_projects enable row level security;

-- No anon/authenticated policies are created intentionally. Browser access is through
-- Express only. The service-role key bypasses RLS, so Express MUST authorize every route.
-- Never add the service-role key to frontend code or publish it in GitHub.
