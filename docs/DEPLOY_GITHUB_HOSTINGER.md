# Deploy automatico GitHub -> Hostinger

## Quando precisa deploy

Alteracoes de produtos, banners, pedidos e configuracoes feitas no Supabase aparecem no site sem FTP, porque o site consulta o Supabase diretamente.

O deploy via FTP e necessario quando houver alteracao de codigo, visual, rotas ou componentes no GitHub/Lovable.

## Fluxo automatico

1. Alterar o site no Lovable.
2. Fazer commit/push para o GitHub.
3. O GitHub Actions roda `npm ci` e `npm run build:hostinger`.
4. O conteudo de `dist/client` e enviado para a raiz FTP da Hostinger.
5. O site passa a servir a versao nova.

## Secrets necessarios no GitHub

No repositorio do GitHub, entrar em:

`Settings > Secrets and variables > Actions > New repository secret`

Criar estes secrets:

- `HOSTINGER_FTP_SERVER`
- `HOSTINGER_FTP_USERNAME`
- `HOSTINGER_FTP_PASSWORD`

O workflow usa FTP na porta `21`.
Nao coloque a senha FTP em arquivos do projeto; salve apenas no GitHub Secrets.

## Arquivos que fazem o deploy funcionar

- `.github/workflows/deploy-hostinger.yml`
- `scripts/generate-static-index.mjs`
- `public/.htaccess`
- `public/index.php`

O script `scripts/generate-static-index.mjs` cria o `dist/client/index.html` usado pela Hostinger.
O arquivo `public/.htaccess` faz as rotas do React funcionarem na Hostinger.
O arquivo `public/index.php` garante que a Hostinger entregue o `index.html` mesmo quando o servidor prioriza PHP.
