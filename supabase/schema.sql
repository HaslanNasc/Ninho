-- ============================================================
-- NINHO — Esquema do banco (PostgreSQL / Supabase)
-- Execute no painel do Supabase: SQL Editor > New query > Run
-- ============================================================

-- Extens\u00f5es
create extension if not exists pgcrypto;

-- ---------- PERFIS ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usu\u00e1ria',
  username text,
  phone text,
  avatar_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- ESPA\u00c7O DOM\u00c9STICO ----------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nosso Ninho',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  code text unique not null,
  created_by uuid references profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Fun\u00e7\u00e3o auxiliar: o usu\u00e1rio atual \u00e9 membro do household?
create or replace function is_member(h uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from household_members
    where household_id = h and profile_id = auth.uid());
$$;

-- ---------- MODELO GEN\u00c9RICO DE NEG\u00d3CIO ----------
-- Padr\u00e3o de colunas em todas as tabelas de dom\u00ednio:
--   owner_id    -> dono (privacidade pessoal)
--   household_id-> espa\u00e7o dom\u00e9stico
--   shared bool -> vis\u00edvel para os membros do household
--   created_by / updated_by / timestamps -> trilha de autoria

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  name text not null, institution text, type text default 'conta',
  is_credit boolean default false, balance_cents bigint default 0,
  shared boolean default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  description text not null, total_cents bigint not null default 0,
  paid_cents bigint not null default 0,
  due_date date, creditor text, category text, status text default 'pendente',
  notes text, shared boolean default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists goals ( -- caixinhas / metas
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  name text not null, target_cents bigint default 0, saved_cents bigint default 0,
  shared boolean default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists inventory_items ( -- sempre compartilhado
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null, category text, note text,
  qty numeric default 0, qty_min numeric default 0, qty_buy numeric default 0,
  unit text default 'un', status text default 'disponivel',
  shared boolean default true,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists reforms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null, description text, area text, icon text,
  cover_url text, start_date date, est_end date, status text default 'planejada',
  budget_cents bigint default 0,
  shared boolean default true,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists reform_items (
  id uuid primary key default gen_random_uuid(),
  reform_id uuid not null references reforms(id) on delete cascade,
  kind text default 'material', name text not null, store text, link text,
  total_cents bigint default 0, installments int default 1,
  created_by uuid default auth.uid(), created_at timestamptz default now()
);

create table if not exists events ( -- calend\u00e1rio e tarefas
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  title text not null, description text, date date, time text, place text,
  category text default 'casa', status text default 'pendente',
  reminder jsonb default '{}'::jsonb, shared boolean default true,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null, photo_url text, species text, info text, notes text,
  shared boolean default true,
  created_by uuid default auth.uid(), created_at timestamptz default now()
);

create table if not exists pet_care (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  kind text default 'med', name text not null, instructions text,
  frequency text, start_date date, end_date date, reminder boolean default false,
  shared boolean default true,
  created_by uuid default auth.uid(), created_at timestamptz default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  product text not null, description text, category text, photo_url text,
  total_cents bigint default 0, store text, link text,
  buy_date date, delivery_date date, method text, account text,
  installments int default 1, installment_cents bigint default 0,
  paid_installments int default 0, due_day int,
  shared boolean default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- movimenta\u00e7\u00f5es (pagamentos parciais, contribui\u00e7\u00f5es de caixinha)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) default auth.uid(),
  household_id uuid references households(id) on delete set null,
  debt_id uuid references debts(id) on delete cascade,
  purchase_id uuid references purchases(id) on delete cascade,
  reform_id uuid references reforms(id) on delete cascade,
  goal_id uuid references goals(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  amount_cents bigint not null, method text, note text,
  paid_at date default current_date, payer_id uuid default auth.uid(),
  shared boolean default false, created_at timestamptz default now()
);
