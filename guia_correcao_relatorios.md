# Guia para Correção dos Relatórios

Para resolver o problema dos relatórios que não estão mostrando as atividades da semana, pendências e etapas em andamento, siga os passos abaixo:

## 1. Limpar os Relatórios Existentes

Primeiro, precisamos limpar os relatórios existentes no banco de dados para que novos relatórios possam ser gerados com as alterações:

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto com a URL `https://ionichwiclbqlfcsmhhy.supabase.co`
4. No menu lateral, clique em "SQL Editor"
5. Clique em "New Query" (Nova Consulta)
6. Copie e cole o conteúdo do arquivo `limpar_relatorios.sql` que foi criado no seu projeto
7. Clique em "Run" (Executar)

Isso excluirá todos os relatórios existentes e permitirá que novos relatórios sejam gerados com as alterações.

## 2. Limpar o Cache do Navegador

O navegador pode estar armazenando em cache os relatórios antigos. Para limpar o cache:

1. Pressione Ctrl+Shift+Delete (ou Cmd+Shift+Delete no Mac)
2. Selecione "Limpar dados de navegação"
3. Marque a opção "Imagens e arquivos em cache"
4. Clique em "Limpar dados"

## 3. Reiniciar o Servidor de Desenvolvimento

Reinicie o servidor de desenvolvimento para garantir que todas as alterações sejam aplicadas:

1. Encerre o servidor atual (Ctrl+C no terminal)
2. Execute `npm run dev` para iniciar o servidor novamente

## 4. Gerar um Novo Relatório

Agora você pode gerar um novo relatório:

1. Acesse a página de relatórios de uma obra
2. Selecione uma semana que tenha atividades registradas
3. Clique no botão "Gerar Relatório"

O novo relatório deve incluir:
- As atividades registradas no diário de obra durante a semana selecionada
- As etapas em andamento (iniciadas mas não concluídas)
- As pendências da obra (do quadro Trello)

## Verificação de Problemas

Se o problema persistir, verifique o console do navegador (F12) para ver mensagens de erro detalhadas:

1. Pressione F12 para abrir as ferramentas de desenvolvedor
2. Clique na aba "Console"
3. Verifique se há mensagens de erro relacionadas à geração do relatório

## Solução Alternativa

Se ainda houver problemas, você pode tentar:

1. Verificar se a tabela `relatorios` no Supabase tem as colunas corretas (data_inicio, data_fim, conteudo)
2. Executar o script `update_relatorios.sql` novamente para garantir que a estrutura da tabela esteja correta
3. Verificar se há erros no console do servidor (no terminal onde o servidor está sendo executado) 