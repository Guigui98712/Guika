-- Adicionar colunas cliente e responsavel na tabela obras
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS cliente TEXT,
ADD COLUMN IF NOT EXISTS responsavel TEXT;

-- Atualizar políticas de acesso para incluir os novos campos
ALTER POLICY "Permitir acesso público às obras" ON obras
USING (true);

-- Garantir que os novos campos sejam incluídos nas operações de inserção e atualização
ALTER POLICY "Permitir inserção de obras para usuários autenticados" ON obras
USING (auth.role() = 'authenticated');

ALTER POLICY "Permitir atualização de obras para usuários autenticados" ON obras
USING (auth.role() = 'authenticated'); 