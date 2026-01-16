-- Drop first to force refresh of return type
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
