-- 1. Ensure EVENTS table has all necessary columns
alter table events add column if not exists price numeric default 0;
alter table events add column if not exists latitude float;
alter table events add column if not exists longitude float;

-- 2. Drop and Recreate the Geospatial Search Function to ensure it sees the new columns
drop function if exists get_events_nearby;

create or replace function get_events_nearby(
  lat float,
  long float,
  radius_km float default 60
)
returns setof events
language sql
as $$
  select *
  from events
  where 
    event_date >= now()
    and (
      6371 * acos(
        cos(radians(lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(long)) +
        sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= radius_km
  order by event_date;
$$;
