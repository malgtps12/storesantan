-- Jalankan ini di Dashboard Supabase -> SQL Editor:

-- 1. Table users (owner)
create table if not exists public.users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  role text not null default 'owner',
  created_at text not null
);

-- 2. Table orders
create table if not exists public.orders (
  id text primary key,
  items jsonb not null,
  total int not null,
  status text not null default 'pending',
  proof_path text,
  created_at text not null,
  approved_at text,
  rejected_at text
);

-- 3. Buka izin RLS (Anon key bisa insert/select jika backend pakai anon key)
alter table public.users enable row level security;
alter table public.orders enable row level security;

create policy "Allow anon all on users" on public.users for all using (true) with check (true);
create policy "Allow anon all on orders" on public.orders for all using (true) with check (true);
