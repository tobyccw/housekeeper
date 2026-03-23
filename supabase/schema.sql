-- ============================================================
-- Housekeeper — Supabase Database Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Households (one per family)
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  avatar_color text default '#6366f1',
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default now()
);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  icon text default '📦',
  is_subscription boolean default false,
  created_at timestamp with time zone default now()
);

-- Sub-categories
create table if not exists sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Receipts
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  added_by uuid references profiles(id) on delete set null,
  store_name text not null,
  purchase_date date not null,
  total_amount numeric(10,2),
  image_url text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Receipt items
create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  quantity integer default 1,
  category_id uuid references categories(id) on delete set null,
  sub_category_id uuid references sub_categories(id) on delete set null,
  for_member uuid references profiles(id) on delete set null,
  subscription_cycle text check (subscription_cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  notes text,
  created_at timestamp with time zone default now()
);

-- Shopping list
create table if not exists shopping_list (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  added_by uuid references profiles(id) on delete set null,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  quantity integer default 1,
  is_completed boolean default false,
  notes text,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table households enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table sub_categories enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table shopping_list enable row level security;

-- Helper function: get current user's household_id
create or replace function get_my_household_id()
returns uuid language sql security definer stable as $$
  select household_id from profiles where id = auth.uid()
$$;

-- Households: members can read/update their own household
create policy "household_select" on households for select
  using (id = get_my_household_id());

create policy "household_update" on households for update
  using (id = get_my_household_id());

-- Profiles: users can read profiles in their household
create policy "profiles_select" on profiles for select
  using (household_id = get_my_household_id() or id = auth.uid());

create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- Categories: household members can CRUD
create policy "categories_select" on categories for select
  using (household_id = get_my_household_id());

create policy "categories_insert" on categories for insert
  with check (household_id = get_my_household_id());

create policy "categories_update" on categories for update
  using (household_id = get_my_household_id());

create policy "categories_delete" on categories for delete
  using (household_id = get_my_household_id());

-- Sub-categories: same as categories
create policy "sub_categories_select" on sub_categories for select
  using (household_id = get_my_household_id());

create policy "sub_categories_insert" on sub_categories for insert
  with check (household_id = get_my_household_id());

create policy "sub_categories_update" on sub_categories for update
  using (household_id = get_my_household_id());

create policy "sub_categories_delete" on sub_categories for delete
  using (household_id = get_my_household_id());

-- Receipts
create policy "receipts_select" on receipts for select
  using (household_id = get_my_household_id());

create policy "receipts_insert" on receipts for insert
  with check (household_id = get_my_household_id());

create policy "receipts_update" on receipts for update
  using (household_id = get_my_household_id());

create policy "receipts_delete" on receipts for delete
  using (household_id = get_my_household_id());

-- Receipt items
create policy "receipt_items_select" on receipt_items for select
  using (household_id = get_my_household_id());

create policy "receipt_items_insert" on receipt_items for insert
  with check (household_id = get_my_household_id());

create policy "receipt_items_update" on receipt_items for update
  using (household_id = get_my_household_id());

create policy "receipt_items_delete" on receipt_items for delete
  using (household_id = get_my_household_id());

-- Shopping list
create policy "shopping_list_select" on shopping_list for select
  using (household_id = get_my_household_id());

create policy "shopping_list_insert" on shopping_list for insert
  with check (household_id = get_my_household_id());

create policy "shopping_list_update" on shopping_list for update
  using (household_id = get_my_household_id());

create policy "shopping_list_delete" on shopping_list for delete
  using (household_id = get_my_household_id());

-- ============================================================
-- INDEXES (for performance)
-- ============================================================

create index if not exists idx_receipt_items_household on receipt_items(household_id);
create index if not exists idx_receipt_items_created_at on receipt_items(created_at);
create index if not exists idx_receipt_items_category on receipt_items(category_id);
create index if not exists idx_receipts_household on receipts(household_id);
create index if not exists idx_receipts_date on receipts(purchase_date);
create index if not exists idx_shopping_list_household on shopping_list(household_id);
