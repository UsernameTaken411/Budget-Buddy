-- Person B schema: budgets, savings goals, and subscriptions.
-- All tables are isolated per authenticated user through RLS.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  currency char(3) not null default 'SGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant text not null check (char_length(trim(merchant)) between 1 and 120),
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  transaction_type text not null default 'expense'
    check (transaction_type in ('income', 'expense')),
  transaction_date date not null,
  currency char(3) not null default 'SGD',
  notes text not null default '',
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'receipt')),
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 80),
  amount numeric(12,2) not null check (amount > 0),
  period text not null default 'monthly' check (period = 'monthly'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, period)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  amount numeric(12,2) not null check (amount > 0),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date date not null,
  category text not null default 'Subscriptions',
  reminder_days_before integer not null default 3
    check (reminder_days_before between 0 and 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists reminder_days_before integer not null default 3
  check (reminder_days_before between 0 and 30);

create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists transactions_user_date_idx
  on public.transactions(user_id, transaction_date desc);
create index if not exists savings_goals_user_id_idx on public.savings_goals(user_id);
create index if not exists subscriptions_user_date_idx
  on public.subscriptions(user_id, next_billing_date);

alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users manage their own budgets" on public.budgets;
drop policy if exists "Users manage their own transactions" on public.transactions;
drop policy if exists "Users manage their own savings goals" on public.savings_goals;
drop policy if exists "Users manage their own subscriptions" on public.subscriptions;

create policy "Users manage their own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own savings goals" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- When Person A's transactions table exists, budget progress uses live expenses.
-- Until then the view remains usable with zero spent, so this branch runs alone.
do $$
begin
  if to_regclass('public.transactions') is not null then
    execute $view$
      create or replace view public.budget_progress
      with (security_invoker = true) as
      select
        b.*,
        coalesce(sum(abs(t.amount)) filter (
          where t.transaction_type = 'expense'
            and date_trunc('month', t.transaction_date) = date_trunc('month', current_date)
        ), 0)::numeric(12,2) as spent,
        greatest(b.amount - coalesce(sum(abs(t.amount)) filter (
          where t.transaction_type = 'expense'
            and date_trunc('month', t.transaction_date) = date_trunc('month', current_date)
        ), 0), 0)::numeric(12,2) as remaining
      from public.budgets b
      left join public.transactions t
        on t.user_id = b.user_id and lower(t.category) = lower(b.category)
      group by b.id
    $view$;
  else
    execute $view$
      create or replace view public.budget_progress
      with (security_invoker = true) as
      select b.*, 0::numeric(12,2) as spent, b.amount::numeric(12,2) as remaining
      from public.budgets b
    $view$;
  end if;
end $$;

create or replace view public.savings_goal_progress
with (security_invoker = true) as
select
  g.*,
  least(round((g.current_amount / g.target_amount) * 100, 1), 100) as progress_percent
from public.savings_goals g;

create or replace view public.subscription_costs
with (security_invoker = true) as
select
  s.*,
  case s.billing_cycle
    when 'weekly' then round(s.amount * 52 / 12, 2)
    when 'quarterly' then round(s.amount / 3, 2)
    when 'yearly' then round(s.amount / 12, 2)
    else s.amount
  end as monthly_cost
from public.subscriptions s;
