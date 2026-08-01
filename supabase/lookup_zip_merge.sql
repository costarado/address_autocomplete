-- RPC over existing public.zip_merge (do NOT recreate cities/streets).
-- IMPORTANT: match street_name EXACTLY. Prefix/fuzzy match confuses
--   ראובן  vs  ראובן ובת שבע  (wrong ZIP 7535714 instead of 7524527).
-- Run this in Supabase SQL Editor after changes.

create or replace function public.lookup_zip_merge(
  p_city text,
  p_street text,
  p_house text default null
)
returns table (
  location_name text,
  street_name text,
  house_number text,
  entrance text,
  zip5 bigint,
  zip7 bigint,
  match_rank int
)
language sql
stable
as $$
  with norm as (
    select
      trim(both from coalesce(p_city, '')) as city,
      trim(both from coalesce(p_street, '')) as street,
      case
        when nullif(regexp_replace(coalesce(p_house, ''), '\D', '', 'g'), '') is null then null
        else lpad(
          (regexp_replace(coalesce(p_house, ''), '\D', '', 'g'))::text,
          5,
          '0'
        )
      end as house_pad
  )
  select
    z."location_name",
    z.street_name,
    z.house_number,
    z.entrance,
    z.zip5,
    z.zip7,
    case
      when n.house_pad is not null and z.house_number = n.house_pad then 0
      when n.house_pad is null then 1
      else 2
    end as match_rank
  from public.zip_merge z
  cross join norm n
  where z."location_name" = n.city
    -- Exact street only (no LIKE / starts-with).
    and z.street_name = n.street
    and (
      n.house_pad is null
      or z.house_number = n.house_pad
    )
  order by
    match_rank,
    z.zip7 nulls last
  limit 1;
$$;

revoke all on function public.lookup_zip_merge(text, text, text) from public;
grant execute on function public.lookup_zip_merge(text, text, text) to service_role;

-- Correct:
--   select * from public.lookup_zip_merge('ראשון לציון', 'ראובן', '11');
--   -> zip7 7524527, street ראובן
-- Wrong street (similar name):
--   select * from public.lookup_zip_merge('ראשון לציון', 'ראובן ובת שבע', '11');
--   -> zip7 7535714 / 7535713 / 7535715 depending on entrance rows
