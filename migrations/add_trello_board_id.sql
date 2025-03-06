-- Adicionar coluna trello_board_id na tabela obras
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS trello_board_id VARCHAR(255);

-- Adicionar políticas de segurança para a coluna trello_board_id
CREATE POLICY "Permitir leitura do trello_board_id para todos" ON obras
FOR SELECT
USING (true);

CREATE POLICY "Permitir atualização do trello_board_id" ON obras
FOR UPDATE
USING (true)
WITH CHECK (true);