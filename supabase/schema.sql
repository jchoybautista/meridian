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

-- Portfolio holdings (built on request) -------------------------------------
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_symbol text not null,
  asset_name text not null,
  asset_type text not null check (asset_type in ('crypto', 'stock')),
  asset_id text,
  quantity numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.portfolio_holdings enable row level security;

create policy "Users can view their own holdings"
  on public.portfolio_holdings for select using (auth.uid() = user_id);
create policy "Users can manage their own holdings"
  on public.portfolio_holdings for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
