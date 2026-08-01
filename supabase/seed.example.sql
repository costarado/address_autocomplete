-- Example rows for smoke-testing lookup_postal_code.
-- Replace with real IL data before enabling ADDRESS_REF_ENABLED in production.

insert into public.cities (name_he, name_en, aliases)
values ('תל אביב', 'Tel Aviv', array['תל-אביב', 'Tel-Aviv', 'Tel Aviv-Yafo'])
on conflict do nothing;

insert into public.streets (city_id, name_he, name_en, aliases)
select c.id, 'דיזנגוף', 'Dizengoff', array['Dizengof', 'דיזינגוף']
from public.cities c
where c.name_en = 'Tel Aviv'
limit 1;

insert into public.postal_codes (street_id, house_from, house_to, side, postal_code)
select s.id, 1, 99, 'all', '6433211'
from public.streets s
join public.cities c on c.id = s.city_id
where c.name_en = 'Tel Aviv' and s.name_en = 'Dizengoff'
limit 1;

-- select * from public.lookup_postal_code('Tel Aviv', 'Dizengoff', 12);
