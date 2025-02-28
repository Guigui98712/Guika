-- Criar tabela de relatórios
CREATE TABLE IF NOT EXISTS relatorios (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    obra_id BIGINT REFERENCES obras(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('semanal', 'final')),
    conteudo TEXT,
    pdf_url TEXT,
    drive_folder_id TEXT,
    drive_file_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_relatorios_obra_id ON relatorios(obra_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_data_inicio ON relatorios(data_inicio);
CREATE INDEX IF NOT EXISTS idx_relatorios_tipo ON relatorios(tipo);

-- Habilitar RLS
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Permitir select para usuários autenticados"
    ON relatorios FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir insert para usuários autenticados"
    ON relatorios FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir update para usuários autenticados"
    ON relatorios FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir delete para usuários autenticados"
    ON relatorios FOR DELETE
    TO authenticated
    USING (true); 