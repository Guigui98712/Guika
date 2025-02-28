-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON relatorios;
DROP POLICY IF EXISTS "Permitir insert para usuários autenticados" ON relatorios;
DROP POLICY IF EXISTS "Permitir update para usuários autenticados" ON relatorios;
DROP POLICY IF EXISTS "Permitir delete para usuários autenticados" ON relatorios;

-- Criar novas políticas
CREATE POLICY "Permitir select para todos"
    ON relatorios FOR SELECT
    USING (true);

CREATE POLICY "Permitir insert para todos"
    ON relatorios FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir update para todos"
    ON relatorios FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir delete para todos"
    ON relatorios FOR DELETE
    USING (true); 