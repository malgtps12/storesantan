-- Jalankan ini di Dashboard Supabase -> SQL Editor:
-- Ini akan menggantikan policy lama yang terlalu longgar (using true).

-- 1. Reset Policy Lama
drop policy if exists "Allow anon all on users" on public.users;
drop policy if exists "Allow anon all on orders" on public.orders;
drop policy if exists "Public insert orders only" on public.orders;
drop policy if exists "Block anon read users" on public.users;

-- Pastikan RLS aktif
alter table public.users enable row level security;
alter table public.orders enable row level security;

-- 2. Keamanan Tabel Users:
-- Kunci total akses SELECT/UPDATE/DELETE untuk role 'anon' (publik).
-- Hanya role 'service_role' (server backend privat) yang bisa baca/tulis.
create policy "Block anon on users"
on public.users
for all
to anon
using (false)
with check (false);

-- 3. Keamanan Tabel Orders:
-- Publik (Customer) HANYA diizinkan INSERT pesanan baru dengan status awal 'pending'.
create policy "Allow customer insert pending orders"
on public.orders
for insert
to anon
with check (
  status = 'pending'
);

-- Publik TIDAK diizinkan membaca atau mengedit/ACC pesanan orang lain secara bebas via API Supabase langsung.
-- Akses baca (SELECT) dan update (PATCH ACC/Tolak) dikontrol via Backend Express kita.
create policy "Block anon update delete on orders"
on public.orders
for update
to anon
using (false);

create policy "Block anon delete on orders"
on public.orders
for delete
to anon
using (false);
