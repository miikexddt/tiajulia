-- Crear tabla de promociones
create table promotions (
  id uuid default uuid_generate_v4() primary key,
  product_id bigint references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  promo_price decimal(10,2) not null check (promo_price >= 0),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Seguridad a nivel de fila)
alter table promotions enable row level security;

-- Política de lectura (Pública)
create policy "Promociones son publicas"
  on promotions for select
  using ( true );

-- Política de escritura (Solo autenticados/admin - por ahora permisiva para desarrollo)
create policy "Cualquiera puede administrar promociones"
  on promotions for all
  using ( true )
  with check ( true );

-- Crear índice para búsquedas rápidas por producto
create index promotions_product_id_idx on promotions(product_id);
