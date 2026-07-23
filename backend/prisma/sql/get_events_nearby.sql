-- RPC usada pelo feed do app (busca espacial por raio, em km).
-- Retorna SETOF events para o supabase-js poder embutir host/participantes via .select().
-- Haversine puro (não exige PostGIS). Idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.get_events_nearby(lat float, long float, radius_km int)
RETURNS SETOF public.events
LANGUAGE sql
STABLE
AS $$
  SELECT e.*
  FROM public.events e
  WHERE e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (
      6371 * acos(
        least(1, greatest(-1,
          cos(radians(lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(long)) +
          sin(radians(lat)) * sin(radians(e.latitude))
        ))
      )
    ) <= radius_km;
$$;

GRANT EXECUTE ON FUNCTION public.get_events_nearby(float, float, int) TO anon, authenticated;
