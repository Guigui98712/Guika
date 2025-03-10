-- Script para atualizar a estrutura da tabela relatorios

-- Primeiro, verificamos se as colunas existem e, se não, as adicionamos
DO $$
BEGIN
    -- Verificar se a coluna data_inicio existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'data_inicio') THEN
        -- Se a coluna data existe, renomeá-la para data_inicio
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'data') THEN
            ALTER TABLE public.relatorios RENAME COLUMN data TO data_inicio;
        ELSE
            -- Se não existe nem data nem data_inicio, criar data_inicio
            ALTER TABLE public.relatorios ADD COLUMN data_inicio DATE;
        END IF;
    END IF;

    -- Adicionar coluna data_fim se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'data_fim') THEN
        ALTER TABLE public.relatorios ADD COLUMN data_fim DATE;
    END IF;

    -- Adicionar coluna pdf_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'pdf_url') THEN
        ALTER TABLE public.relatorios ADD COLUMN pdf_url TEXT;
    END IF;

    -- Adicionar coluna drive_folder_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'drive_folder_id') THEN
        ALTER TABLE public.relatorios ADD COLUMN drive_folder_id TEXT;
    END IF;

    -- Adicionar coluna drive_file_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'relatorios' 
                   AND column_name = 'drive_file_id') THEN
        ALTER TABLE public.relatorios ADD COLUMN drive_file_id TEXT;
    END IF;

    -- Criar índices se não existirem
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'relatorios' 
                   AND indexname = 'idx_relatorios_obra_id') THEN
        CREATE INDEX idx_relatorios_obra_id ON public.relatorios(obra_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'relatorios' 
                   AND indexname = 'idx_relatorios_data_inicio') THEN
        CREATE INDEX idx_relatorios_data_inicio ON public.relatorios(data_inicio);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'relatorios' 
                   AND indexname = 'idx_relatorios_tipo') THEN
        CREATE INDEX idx_relatorios_tipo ON public.relatorios(tipo);
    END IF;
END $$;

-- Atualizar as políticas de segurança para permitir acesso a usuários autenticados
DO $$
BEGIN
    -- Remover políticas existentes para evitar duplicação
    DROP POLICY IF EXISTS "Permitir acesso a usuários autenticados" ON public.relatorios;
    DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON public.relatorios;
    DROP POLICY IF EXISTS "Permitir insert para usuários autenticados" ON public.relatorios;
    DROP POLICY IF EXISTS "Permitir update para usuários autenticados" ON public.relatorios;
    DROP POLICY IF EXISTS "Permitir delete para usuários autenticados" ON public.relatorios;
    
    -- Criar novas políticas
    CREATE POLICY "Permitir select para usuários autenticados"
        ON public.relatorios FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Permitir insert para usuários autenticados"
        ON public.relatorios FOR INSERT
        TO authenticated
        WITH CHECK (true);

    CREATE POLICY "Permitir update para usuários autenticados"
        ON public.relatorios FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Permitir delete para usuários autenticados"
        ON public.relatorios FOR DELETE
        TO authenticated
        USING (true);
END $$;

-- Instruções para o usuário
COMMENT ON TABLE public.relatorios IS 'Tabela para relatórios semanais e finais de obras'; 