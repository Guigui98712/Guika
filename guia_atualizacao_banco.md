# Guia para Atualização do Banco de Dados

Para resolver os problemas de salvar registros no diário de obra e gerar relatórios, é necessário atualizar a estrutura das tabelas no Supabase. Siga os passos abaixo:

## 1. Acesse o Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto com a URL `https://ionichwiclbqlfcsmhhy.supabase.co`

## 2. Acesse o SQL Editor

1. No menu lateral, clique em "SQL Editor"
2. Clique em "New Query" (Nova Consulta)

## 3. Execute o Script SQL para o Diário de Obra

1. Copie o conteúdo do arquivo `update_diario_obra.sql` que foi criado no seu projeto
2. Cole o conteúdo no editor SQL do Supabase
3. Clique em "Run" (Executar)

O script fará o seguinte:
- Adicionar as colunas necessárias à tabela `diario_obra` se elas não existirem:
  - `observacoes` (texto)
  - `etapas_iniciadas` (array de texto)
  - `etapas_concluidas` (array de texto)
  - `fotos` (array de texto)
- Atualizar as políticas de segurança para permitir acesso a usuários autenticados

## 4. Execute o Script SQL para os Relatórios

1. Crie uma nova consulta no SQL Editor
2. Copie o conteúdo do arquivo `update_relatorios.sql` que foi criado no seu projeto
3. Cole o conteúdo no editor SQL do Supabase
4. Clique em "Run" (Executar)

O script fará o seguinte:
- Atualizar a estrutura da tabela `relatorios`:
  - Renomear a coluna `data` para `data_inicio` (se existir)
  - Adicionar a coluna `data_fim` (se não existir)
  - Adicionar colunas para armazenar URLs de PDF e IDs do Google Drive
- Criar índices para melhorar o desempenho das consultas
- Atualizar as políticas de segurança para permitir acesso a usuários autenticados

## 5. Verifique a Estrutura das Tabelas

1. No menu lateral, clique em "Table Editor"
2. Verifique se as tabelas `diario_obra` e `relatorios` têm todas as colunas necessárias

## 6. Teste a Aplicação

Após executar os scripts, volte para a aplicação e teste:
1. Salvar um registro no diário de obra
2. Gerar um relatório semanal

Agora ambas as funcionalidades devem funcionar corretamente.

## Observações

Se você ainda encontrar problemas, verifique o console do navegador (F12) para ver mensagens de erro detalhadas que foram adicionadas ao código. 