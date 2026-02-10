-- 1. Função get_events_nearby (Geolocalização simples)
CREATE OR REPLACE FUNCTION public.get_events_nearby(lat float, long float, radius_km float)
RETURNS SETOF events
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM events
  WHERE (
    6371 * ACOS(
      LEAST(1.0, GREATEST(-1.0, 
        COS(RADIANS(lat)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(long)) +
        SIN(RADIANS(lat)) * SIN(RADIANS(latitude))
      ))
    )
  ) <= radius_km;
$$;

-- 2. Corrigir permissões gerais
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Corrigir RLS da tabela profiles (Evitar erro de Permissão e Looping)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para recriar limpo
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Política de Leitura Pública
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Política de Atualização (O PRÓPRIO USUÁRIO pode editar seu perfil)
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política de Inserção (Caso precise criar o perfil manualmente)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Adicionar coluna token se faltar
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 5. Recarregar Schema
NOTIFY pgrst, 'reload schema';
