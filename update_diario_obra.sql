-- Script para atualizar a estrutura da tabela diario_obra

-- Primeiro, verificamos se as colunas existem e, se não, as adicionamos
DO $$
BEGIN
    -- Adicionar coluna observacoes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'diario_obra' 
                   AND column_name = 'observacoes') THEN
        ALTER TABLE public.diario_obra ADD COLUMN observacoes TEXT;
    END IF;

    -- Adicionar coluna etapas_iniciadas se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'diario_obra' 
                   AND column_name = 'etapas_iniciadas') THEN
        ALTER TABLE public.diario_obra ADD COLUMN etapas_iniciadas TEXT[] DEFAULT '{}';
    END IF;

    -- Adicionar coluna etapas_concluidas se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'diario_obra' 
                   AND column_name = 'etapas_concluidas') THEN
        ALTER TABLE public.diario_obra ADD COLUMN etapas_concluidas TEXT[] DEFAULT '{}';
    END IF;

    -- Adicionar coluna fotos se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'diario_obra' 
                   AND column_name = 'fotos') THEN
        ALTER TABLE public.diario_obra ADD COLUMN fotos TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Atualizar as políticas de segurança para permitir acesso a usuários autenticados
DO $$
BEGIN
    -- Remover políticas existentes para evitar duplicação
    DROP POLICY IF EXISTS "Permitir acesso a usuários autenticados" ON public.diario_obra;
    
    -- Criar nova política
    CREATE POLICY "Permitir acesso a usuários autenticados" ON public.diario_obra
      FOR ALL USING (auth.role() = 'authenticated');
END $$;

-- Instruções para o usuário
COMMENT ON TABLE public.diario_obra IS 'Tabela para registros do diário de obra com suporte a observações, etapas e fotos'; 