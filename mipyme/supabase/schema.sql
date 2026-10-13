-- =====================================================================
-- MI PYME — Esquema PostgreSQL / Supabase (Multi-Tenant por business_id)
-- Seguridad: TODAS las tablas de negocio se filtran por business_id
-- mediante Row Level Security (RLS). Ningún negocio puede leer datos
-- de otro negocio, incluso autenticado.
-- Ejecutar en: Supabase Studio > SQL Editor
-- =====================================================================

create extension if not exists "pgcrypto";

-- Orden de creación respeta dependencias FK: businesses -> business_members.

-- Helper INMUTABLE-ish: ¿el usuario actual pertenece al negocio?
create or replace function public.is_business_member(b_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = b_id and user_id = auth.uid()
  );
$$;

-- Helper: ¿el usuario actual es admin del negocio?
create or replace function public.is_business_admin(b_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = b_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- ---------- Negocios (tenants) ----------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  industry      text not null default 'abarrotes', -- ropa | carniceria | abarrotes | ...
  address       text,
  currency_default text not null default 'NIO',    -- Córdobas
  exchange_rate_nio_usd numeric(10,4) not null default 36.80, -- Tasa C$/USD configurable
  low_stock_threshold integer not null default 5,
  logo_url      text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- Tabla auxiliar: negocios de cada usuario ----------
-- (Se declara después de businesses por la FK; evita consultar profiles
--  en cada política y acelera las comprobaciones de RLS.)
create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id)       on delete cascade,
  role        text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  joined_at   timestamptz not null default now(),
  primary key (business_id, user_id)
);

-- ---------- Categorías ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  color       text default '#7209B7',
  created_at  timestamptz not null default now()
);

-- ---------- Productos ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,
  barcode      text,                              -- escáner por cámara
  sku          text,
  price_nio    numeric(12,2) not null default 0,  -- precio venta en Córdobas
  cost_nio     numeric(12,2) not null default 0,  -- precio de costo
  stock        numeric(12,3) not null default 0,  -- permite fracciones (carnicería: kg)
  unit         text not null default 'u',         -- u | kg | lt
  is_active    boolean not null default true,
  image_url    text,
  created_at   timestamptz not null default now(),
  unique (business_id, barcode)
);

-- ---------- Cajas (apertura/arqueo/cierre) ----------
create table if not exists public.cash_registers (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  opened_by      uuid references auth.users(id),
  closed_by      uuid references auth.users(id),
  status         text not null default 'open' check (status in ('open','closed')),
  opening_fund   numeric(12,2) not null default 0,
  closing_count  numeric(12,2),                   -- arqueo físico al cerrar
  expected_amount numeric(12,2),                  -- esperado vs físico (diferencia)
  notes          text,
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz
);

-- ---------- Ventas ----------
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  register_id     uuid references public.cash_registers(id) on delete set null,
  seller_id       uuid references auth.users(id),
  folio           text not null,                  -- Nº correlativo visible en ticket
  total_nio       numeric(12,2) not null,
  total_usd       numeric(12,2) not null default 0,
  payment_breakdown jsonb not null default '[]',  -- pagos mixtos [{method,currency,amount}]
  change_nio      numeric(12,2) not null default 0,
  status          text not null default 'completed' check (status in ('completed','void','fiado')),
  customer_name   text,                           -- para fiado
  exchange_rate   numeric(10,4) not null default 36.80,
  created_at      timestamptz not null default now()
);

-- ---------- Ítems de venta ----------
create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  name_snapshot text not null,                    -- nombre al momento de vender
  qty          numeric(12,3) not null,
  unit_price_nio numeric(12,2) not null,
  line_total_nio numeric(12,2) not null
);

-- ---------- Fiados (cuentas por cobrar) ----------
create table if not exists public.credit_accounts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  sale_id      uuid references public.sales(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  amount_nio   numeric(12,2) not null,
  paid_nio     numeric(12,2) not null default 0,
  due_date     date,
  status       text not null default 'pending' check (status in ('pending','paid','overdue')),
  created_at   timestamptz not null default now()
);

-- ---------- Movimientos de caja (egresos/ingresos manuales) ----------
create table if not exists public.cash_movements (
  id           uuid not null default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  register_id  uuid references public.cash_registers(id) on delete set null,
  type         text not null check (type in ('in','out')),
  amount_nio   numeric(12,2) not null,
  reason       text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  primary key (id)
);

-- ---------- Cola de sincronización offline-first (espejo servidor) ----------
-- La app guarda operaciones locales y las sube aquí al recuperar conexión.
create table if not exists public.sync_queue (
  id           uuid not null default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  entity       text not null,          -- 'sale' | 'product' | 'cash_register' | ...
  op           text not null check (op in ('insert','update','delete')),
  payload      jsonb not null,
  synced_at    timestamptz,
  created_at   timestamptz not null default now(),
  primary key (id)
);

-- =====================================================================
-- ROW LEVEL SECURITY — Aislamiento estricto por business_id
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.businesses        enable row level security;
alter table public.business_members  enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.cash_registers    enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.credit_accounts   enable row level security;
alter table public.cash_movements    enable row level security;
alter table public.sync_queue        enable row level security;

-- Perfiles: cada quien ve/edita el suyo
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Negocios: solo miembros pueden leer; solo el dueño edita
create policy "businesses_read" on public.businesses
  for select using (public.is_business_member(id));
create policy "businesses_insert" on public.businesses
  for insert with check (owner_id = auth.uid());
create policy "businesses_write" on public.businesses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Miembros: un miembro puede ver la lista; solo admin gestiona miembros
create policy "members_read" on public.business_members
  for select using (public.is_business_member(business_id));
create policy "members_admin" on public.business_members
  for all using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

-- Plantilla estándar para tablas de negocio:
-- SELECT/INSERT/UPDATE => cualquier miembro (dueño o vendedor);
-- DELETE => solo admin. Vendedores: POS y caja, sin borrado de catálogo.
do $$
declare t text;
begin
  foreach t in array array['categories','products','cash_registers','sales',
                           'sale_items','credit_accounts','cash_movements','sync_queue']
  loop
    execute format('create policy "%1$s_select" on public.%1$s
      for select using (public.is_business_member(business_id));', t);
    execute format('create policy "%1$s_insert" on public.%1$s
      for insert with check (public.is_business_member(business_id));', t);
    execute format('create policy "%1$s_update" on public.%1$s
      for update using (public.is_business_member(business_id))
      with check (public.is_business_member(business_id));', t);
    execute format('create policy "%1$s_delete" on public.%1$s
      for delete using (public.is_business_admin(business_id));', t);
  end loop;
end $$;

-- Índices de rendimiento multi-tenant
create index if not exists idx_products_business   on public.products(business_id);
create index if not exists idx_sales_business_date on public.sales(business_id, created_at desc);
create index if not exists idx_items_sale          on public.sale_items(sale_id);
create index if not exists idx_credits_business    on public.credit_accounts(business_id, status);
create index if not exists idx_sync_unsynced       on public.sync_queue(business_id) where synced_at is null;

-- Trigger: al crear un negocio, su dueño queda automáticamente como 'admin'
create or replace function public.handle_new_business()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created
  after insert on public.businesses
  for each row execute function public.handle_new_business();

-- Trigger de perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
