-- Meridian — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

-- Watchlist -----------------------------------------------------------------
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_symbol text not null,
  asset_name text not null,
  asset_type text not null check (asset_type in ('crypto', 'stock')),
  asset_id text,
  created_at timestamptz default now()
);

alter table public.watchlist enable row level security;

create policy "Users can view their own watchlist"
  on public.watchlist for select using (auth.uid() = user_id);
create policy "Users can insert into their own watchlist"
  on public.watchlist for insert with check (auth.uid() = user_id);
create policy "Users can delete from their own watchlist"
  on public.watchlist for delete using (auth.uid() = user_id);

-- Drop old placeholder if it was run previously
drop table if exists public.portfolio_holdings;

-- Portfolio transactions (buy/sell log — holdings and P&L are derived client-side) ----
create table if not exists public.portfolio_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  asset_id         text not null,
  asset_symbol     text not null,
  asset_name       text not null,
  asset_type       text not null check (asset_type in ('crypto', 'stock')),
  type             text not null check (type in ('buy', 'sell')),
  quantity         numeric not null check (quantity > 0),
  price_per_unit   numeric not null check (price_per_unit >= 0),
  transacted_at    date not null,
  notes            text,
  created_at       timestamptz default now()
);

alter table public.portfolio_transactions enable row level security;

create policy "Users manage their own transactions"
  on public.portfolio_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Paper trading wallet -------------------------------------------------------
create table if not exists public.paper_wallet (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null unique,
  balance_usd numeric not null default 10000,
  created_at  timestamptz default now()
);

alter table public.paper_wallet enable row level security;

create policy "Users manage their own wallet"
  on public.paper_wallet for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Paper trading orders -------------------------------------------------------
create table if not exists public.paper_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  asset_id     text not null,
  asset_type   text not null check (asset_type in ('crypto', 'stock')),
  asset_symbol text not null,
  asset_name   text not null,
  side         text not null check (side in ('buy', 'sell')),
  order_type   text not null check (order_type in ('limit', 'market', 'stop-limit')),
  quantity     numeric not null check (quantity > 0),
  price        numeric,
  stop_price   numeric,
  tp_price     numeric,
  sl_price     numeric,
  leverage     numeric not null default 1,
  status       text not null default 'pending' check (status in ('pending', 'filled', 'cancelled')),
  filled_price numeric,
  filled_at    timestamptz,
  created_at   timestamptz default now()
);

alter table public.paper_orders enable row level security;

create policy "Users manage their own orders"
  on public.paper_orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
