-- =============================================
-- SCRIPT COMPLETO DE CORREÇÃO: PERFIS + FUNÇÕES + PERMISSÕES
-- =============================================

-- 1. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE (TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. ADICIONAR COLUNAS NECESSÁRIAS NA TABELA PROFILES (SE NÃO EXISTIREM)
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_decade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pets TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superhost BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- 3. PERMISSÕES RLS (ROW LEVEL SECURITY)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Permitir leitura pública de perfis
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Permitir que o usuário atualize seu próprio perfil
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Permitir que o usuário insira seu próprio perfil (fallback)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- =============================================
-- 4. PERMISSÕES GERAIS DE SCHEMA
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- =============================================
-- 5. FUNÇÃO DE GEOLOCALIZAÇÃO (GET_EVENTS_NEARBY)
-- =============================================
DROP FUNCTION IF EXISTS get_events_nearby;

CREATE OR REPLACE FUNCTION public.get_events_nearby(lat float, long float, radius_km float DEFAULT 60)
RETURNS SETOF events
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM events
  WHERE 
    event_date >= now()
    AND (
      6371 * ACOS(
        LEAST(1.0, GREATEST(-1.0, 
          COS(RADIANS(lat)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(long)) +
          SIN(RADIANS(lat)) * SIN(RADIANS(latitude))
        ))
      )
    ) <= radius_km
  ORDER BY event_date;
$$;

-- =============================================
-- 6. CRIAR PERFIL PARA USUÁRIOS EXISTENTES (QUE NÃO TÊM PERFIL)
-- =============================================
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
  created_at,
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 7. RECARREGAR CACHE DO SCHEMA
-- =============================================
NOTIFY pgrst, 'reload schema';
