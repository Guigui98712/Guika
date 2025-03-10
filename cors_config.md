# Configuração do CORS no Supabase

Para permitir que sua aplicação local se comunique com o Supabase, você precisa configurar o CORS (Cross-Origin Resource Sharing) no Supabase.

## Passos para configurar o CORS

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto com a URL `https://ionichwiclbqlfcsmhhy.supabase.co`
4. No menu lateral, clique em "Settings" (Configurações)
5. Clique em "API" na seção de configurações
6. Role para baixo até encontrar a seção "CORS (Cross-Origin Resource Sharing)"
7. Na seção "Allowed Origins", adicione:
   - `http://localhost:8083`
   - `http://26.244.238.245:8083`
   - `http://192.168.68.110:8083`
8. Clique em "Save" (Salvar) para aplicar as alterações

## Verificação

Após configurar o CORS, você pode verificar se a configuração está correta acessando a aplicação em `http://localhost:8083` e verificando se o erro de conexão com o banco de dados foi resolvido.

Se o erro persistir, verifique o console do navegador (F12) para obter mais informações sobre o problema. 