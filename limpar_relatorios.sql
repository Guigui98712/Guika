-- Script para limpar os relatórios existentes
-- Isso permitirá que novos relatórios sejam gerados com as alterações feitas

-- Excluir todos os relatórios existentes
DELETE FROM public.relatorios;

-- Reiniciar a sequência de IDs
ALTER SEQUENCE relatorios_id_seq RESTART WITH 1;

-- Confirmar a exclusão
SELECT 'Todos os relatórios foram excluídos com sucesso!' as mensagem; 