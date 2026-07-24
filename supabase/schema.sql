-- Budget Buddy — full schema, run once in the Supabase SQL editor.
--
-- Covers all three verticals per SCHEMA.md (the locked integration contract):
--   A: transactions, profiles
--   B: budgets, savings_goals, subscriptions
--   C: read-only consumer, no tables of its own
--
-- Safe to re-run: every statement is idempotent (create-if-not-exists /
-- drop-then-create for policies and views).

create extension if not exists "pgcrypto";

-- ===========================================================================
-- A — transactions, profiles  (SCHEMA.md §1, §3)
-- ===========================================================================

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null,
  date        date not null,
  category    text not null default 'other',
  description text not null default '',
  created_at  timestamptz not null default now(),
  constraint transactions_category_check check (category in (
    'food','transport','groceries','shopping','bills','entertainment',
    'health','education','travel','income','transfer','other'
  )),
  constraint transactions_amount_nonzero check (amount <> 0)
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  currency     text not null default 'SGD',
  created_at   timestamptz not null default now()
);

-- ===========================================================================
-- B — budgets, savings_goals, subscriptions  (SCHEMA.md §4, as actually built)
-- ===========================================================================

create table if not exists public.budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null check (char_length(trim(category)) between 1 and 80),
  amount     numeric(12,2) not null check (amount > 0),
  period     text not null default 'monthly' check (period = 'monthly'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, period)
);

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (char_length(trim(name)) between 1 and 100),
  target_amount  numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (char_length(trim(name)) between 1 and 100),
  amount                numeric(12,2) not null check (amount > 0),
  billing_cycle         text not null default 'monthly'
    check (billing_cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date     date not null,
  category              text not null default 'bills',
  reminder_days_before  integer not null default 3
    check (reminder_days_before between 0 and 30),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals(user_id);
create index if not exists subscriptions_user_date_idx
  on public.subscriptions(user_id, next_billing_date);

-- ===========================================================================
-- RLS — identical "own rows" policy on every table (SCHEMA.md §6)
-- ===========================================================================

alter table public.transactions   enable row level security;
alter table public.profiles       enable row level security;
alter table public.budgets        enable row level security;
alter table public.savings_goals  enable row level security;
alter table public.subscriptions  enable row level security;

drop policy if exists "own rows" on public.transactions;
drop policy if exists "own rows" on public.profiles;
drop policy if exists "own rows" on public.budgets;
drop policy if exists "own rows" on public.savings_goals;
drop policy if exists "own rows" on public.subscriptions;

create policy "own rows" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===========================================================================
-- Derived views — server-side aggregation so B's frontend doesn't recompute
-- spend/progress client-side. Built against A's real transactions schema
-- (signed amount, `date`, closed category enum) — NOT the old
-- transaction_type/transaction_date shape from an earlier draft.
-- ===========================================================================

create or replace view public.budget_progress
with (security_invoker = true) as
select
  b.*,
  coalesce(spend.total, 0)::numeric(12,2) as spent,
  greatest(b.amount - coalesce(spend.total, 0), 0)::numeric(12,2) as remaining
from public.budgets b
left join (
  select
    user_id,
    lower(category) as category,
    sum(-amount) as total
  from public.transactions
  where amount < 0
    and category <> 'transfer'
    and date_trunc('month', date) = date_trunc('month', current_date)
  group by user_id, lower(category)
) spend
  on spend.user_id = b.user_id and spend.category = lower(b.category);

create or replace view public.savings_goal_progress
with (security_invoker = true) as
select
  g.*,
  least(round((g.current_amount / nullif(g.target_amount, 0)) * 100, 1), 100) as progress_percent
from public.savings_goals g;

create or replace view public.subscription_costs
with (security_invoker = true) as
select
  s.*,
  case s.billing_cycle
    when 'weekly'    then round(s.amount * 52 / 12, 2)
    when 'quarterly' then round(s.amount / 3, 2)
    when 'yearly'    then round(s.amount / 12, 2)
    else s.amount
  end as monthly_cost
from public.subscriptions s;
