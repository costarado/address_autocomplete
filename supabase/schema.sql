-- OPTIONAL / unused for costarado project.
-- Production already has public.zip_merge (~515k rows).
-- Prefer: supabase/lookup_zip_merge.sql (RPC over zip_merge).
-- Keep this file only if you need a greenfield cities/streets schema.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

create table if not exists public.cities (
  id bigserial primary key,
  name_he text not null,
  name_en text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.streets (
  id bigserial primary key,
  city_id bigint not null references public.cities (id) on delete cascade,
  name_he text not null,
  name_en text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- house_from/house_to inclusive. side: all | odd | even
create table if not exists public.postal_codes (
  id bigserial primary key,
  street_id bigint not null references public.streets (id) on delete cascade,
  house_from int not null default 1,
  house_to int not null default 99999,
  side text not null default 'all' check (side in ('all', 'odd', 'even')),
  postal_code text not null,
  created_at timestamptz not null default now(),
  check (house_from <= house_to)
);

create index if not exists cities_name_he_trgm_idx on public.cities using gin (name_he gin_trgm_ops);
create index if not exists cities_name_en_trgm_idx on public.cities using gin (name_en gin_trgm_ops);
create index if not exists streets_city_id_idx on public.streets (city_id);
create index if not exists streets_name_he_trgm_idx on public.streets using gin (name_he gin_trgm_ops);
create index if not exists streets_name_en_trgm_idx on public.streets using gin (name_en gin_trgm_ops);
create index if not exists postal_codes_street_id_idx on public.postal_codes (street_id);
create index if not exists postal_codes_code_idx on public.postal_codes (postal_code);

create or replace function public.normalize_he(input text)
returns text
language sql
immutable
as $$
  select lower(trim(both from coalesce(input, '')));
$$;

-- Lookup: city + street + optional house -> best postal row
create or replace function public.lookup_postal_code(
  p_city text,
  p_street text,
  p_house int default null
)
returns table (
  city_he text,
  street_he text,
  postal_code text,
  house_from int,
  house_to int,
  side text,
  match_rank int
)
language sql
stable
as $$
  with city_match as (
    select c.id, c.name_he
    from public.cities c
    where public.normalize_he(c.name_he) = public.normalize_he(p_city)
       or public.normalize_he(c.name_en) = public.normalize_he(p_city)
       or public.normalize_he(p_city) = any (
            select public.normalize_he(a) from unnest(c.aliases) a
          )
    order by case
      when public.normalize_he(c.name_he) = public.normalize_he(p_city) then 0
      when public.normalize_he(c.name_en) = public.normalize_he(p_city) then 1
      else 2
    end
    limit 1
  ),
  street_match as (
    select s.id, s.name_he, cm.name_he as city_he
    from public.streets s
    join city_match cm on cm.id = s.city_id
    where public.normalize_he(s.name_he) = public.normalize_he(p_street)
       or public.normalize_he(s.name_en) = public.normalize_he(p_street)
       or public.normalize_he(p_street) = any (
            select public.normalize_he(a) from unnest(s.aliases) a
          )
    order by case
      when public.normalize_he(s.name_he) = public.normalize_he(p_street) then 0
      when public.normalize_he(s.name_en) = public.normalize_he(p_street) then 1
      else 2
    end
    limit 1
  )
  select
    sm.city_he,
    sm.name_he as street_he,
    pc.postal_code,
    pc.house_from,
    pc.house_to,
    pc.side,
    case
      when p_house is not null
        and p_house between pc.house_from and pc.house_to
        and (
          pc.side = 'all'
          or (pc.side = 'odd' and p_house % 2 = 1)
          or (pc.side = 'even' and p_house % 2 = 0)
        )
      then 0
      when p_house is null then 1
      else 2
    end as match_rank
  from street_match sm
  join public.postal_codes pc on pc.street_id = sm.id
  where
    p_house is null
    or (
      p_house between pc.house_from and pc.house_to
      and (
        pc.side = 'all'
        or (pc.side = 'odd' and p_house % 2 = 1)
        or (pc.side = 'even' and p_house % 2 = 0)
      )
    )
  order by match_rank, (pc.house_to - pc.house_from) asc
  limit 1;
$$;

-- Service role / Netlify uses this RPC. Keep anon locked down.
revoke all on function public.lookup_postal_code(text, text, int) from public;
grant execute on function public.lookup_postal_code(text, text, int) to service_role;
