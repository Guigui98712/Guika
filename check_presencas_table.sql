-- Verificar se a tabela presencas_funcionarios existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'presencas_funcionarios'
);

-- Listar as colunas da tabela presencas_funcionarios se ela existir
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'presencas_funcionarios'
ORDER BY ordinal_position; 