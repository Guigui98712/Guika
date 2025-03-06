-- Adicionar coluna trello_board_id na tabela obras
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS trello_board_id VARCHAR(255); 