-- Desativar RLS (Row Level Security) para a tabela presencas_funcionarios
ALTER TABLE public.presencas_funcionarios DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir acesso a usuários autenticados" ON public.presencas_funcionarios;

-- Conceder permissões para todos os usuários
GRANT ALL ON public.presencas_funcionarios TO anon, authenticated, service_role;

-- Verificar se a sequência existe e conceder permissões
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'presencas_funcionarios_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE public.presencas_funcionarios_id_seq TO anon, authenticated, service_role;
  END IF;
END
$$; 