-- RPC over existing public.zip_merge (do NOT recreate cities/streets).
-- Run this in Supabase SQL Editor, then enable ADDRESS_REF_ENABLED in Netlify.

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

-- Smoke test (expect zip7 = 7765137):
-- select * from public.lookup_zip_merge('אשדוד', 'הלל', '9');
