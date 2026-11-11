-- Ejecutar una vez en un proyecto Supabase nuevo.
begin;

create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  apellido text not null check (length(trim(apellido)) between 1 and 80),
  telefono text not null default '' check (length(telefono) <= 40),
  rol text not null default 'cliente' check (rol in ('cliente', 'admin')),
  notificaciones boolean not null default true
);
alter table public.perfiles enable row level security;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.rol = 'admin' and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

create function public.correo_verificado() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
revoke all on function public.correo_verificado() from public;
grant execute on function public.correo_verificado() to authenticated;

create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles(id, nombre, apellido, telefono)
  values (new.id, trim(new.raw_user_meta_data->>'nombre'),
          trim(new.raw_user_meta_data->>'apellido'),
          coalesce(new.raw_user_meta_data->>'telefono', ''));
  return new;
end;
$$;
revoke all on function public.crear_perfil() from public;
create trigger nuevo_usuario after insert on auth.users
for each row execute procedure public.crear_perfil();

revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
-- El rol es administrado exclusivamente desde SQL/backend privilegiado.
grant update(nombre, apellido, telefono, notificaciones) on public.perfiles to authenticated;
create policy leer_perfil on public.perfiles for select to authenticated
using (public.correo_verificado() and (id = auth.uid() or public.es_admin()));
create policy editar_perfil on public.perfiles for update to authenticated
using (id = auth.uid() and public.correo_verificado())
with check (id = auth.uid() and public.correo_verificado());

create table public.catalogo (
  sku text primary key,
  nombre text not null,
  precio numeric(12,2) not null check (precio > 0),
  activo boolean not null default true
);
alter table public.catalogo enable row level security;
revoke all on public.catalogo from anon, authenticated;
grant select on public.catalogo to anon, authenticated;
create policy ver_catalogo on public.catalogo for select using (activo);

create table public.pedidos_cliente (
  id uuid primary key,
  usuario_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  items jsonb not null,
  total numeric(12,2) not null check (total > 0),
  direccion jsonb not null,
  notice boolean not null
);
create index pedidos_por_usuario on public.pedidos_cliente(usuario_id);
alter table public.pedidos_cliente enable row level security;
revoke all on public.pedidos_cliente from anon, authenticated;
grant select on public.pedidos_cliente to authenticated;
create policy leer_pedidos on public.pedidos_cliente for select to authenticated
using (public.correo_verificado() and (usuario_id = auth.uid() or public.es_admin()));

create function public.crear_pedido(solicitud uuid, lineas jsonb, direccion jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  linea jsonb;
  producto public.catalogo;
  cantidad integer;
  importe numeric(12,2) := 0;
  articulos jsonb := '[]';
  avisos boolean;
begin
  if not public.correo_verificado() then raise exception 'Cuenta sin verificar'; end if;
  -- Serializar reintentos de una misma solicitud.
  perform pg_advisory_xact_lock(hashtextextended(solicitud::text, 0));
  if exists(select 1 from public.pedidos_cliente where id = solicitud and usuario_id = auth.uid()) then
    return solicitud;
  end if;
  if solicitud is null or jsonb_typeof(lineas) is distinct from 'array'
    or jsonb_typeof(direccion) is distinct from 'object' then
    raise exception 'Pedido inválido';
  end if;
  if jsonb_array_length(lineas) not between 1 and 100 or length(direccion::text) > 8000 then
    raise exception 'Pedido inválido';
  end if;
  for linea in select value from jsonb_array_elements(lineas) loop
    if coalesce(linea->>'qty', '') !~ '^[1-9][0-9]{0,2}$'
      or not (coalesce(linea->>'size', '') = any(array['XS','S','M','L','XL'])) then
      raise exception 'Cantidad o talla inválida';
    end if;
    cantidad := (linea->>'qty')::integer;
    select * into strict producto from public.catalogo where sku = linea->>'sku' and activo;
    importe := importe + producto.precio * cantidad;
    articulos := articulos || jsonb_build_array(jsonb_build_object(
      'name', producto.nombre, 'img', producto.sku, 'price', producto.precio,
      'size', linea->>'size', 'qty', cantidad));
  end loop;
  select notificaciones into strict avisos from public.perfiles where id = auth.uid();
  insert into public.pedidos_cliente(id, usuario_id, items, total, direccion, notice)
  values (solicitud, auth.uid(), articulos, importe, direccion, avisos);
  return solicitud;
end;
$$;
revoke all on function public.crear_pedido(uuid, jsonb, jsonb) from public;
grant execute on function public.crear_pedido(uuid, jsonb, jsonb) to authenticated;

-- Conserva los módulos actuales del panel con control de concurrencia.
create table public.administracion (
  id integer primary key check (id = 1),
  version integer not null default 0,
  datos jsonb not null
);
alter table public.administracion enable row level security;
revoke all on public.administracion from anon, authenticated;
grant select, update on public.administracion to authenticated;
create policy acceso_admin on public.administracion for all to authenticated
using (public.es_admin()) with check (public.es_admin());
insert into public.administracion(id, datos) values
(1, '{"clients":[],"products":[],"orders":[],"payments":[],"company":{"name":"NO NAME","tax":16,"note":"¡Gracias por preferirnos!"}}');

commit;

