-- 1. Adicionar coluna expo_push_token na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 2. Garantir permissões de uso no schema public (RESOLVE: permission denied for schema public)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 3. Garantir permissões básicas de leitura em tabelas comuns para autenticados e anonimos (ajuste conforme necessidade de segurança)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 4. Garantir permissão de atualização no próprio perfil para o token
-- (Assumindo que RLS já existe, se não, isso habilita RLS e cria política)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 5. Recarregar o cache do schema (o Supabase faz isso automaticamente, mas rodar um comando DDL ajuda)
NOTIFY pgrst, 'reload schema';
