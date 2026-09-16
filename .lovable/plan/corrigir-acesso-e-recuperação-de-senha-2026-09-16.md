# Corrigir acesso e recuperação de senha

## Objetivo
Restaurar o acesso administrativo sem perder perfis, pedidos, pontos ou demais dados existentes.

## Alterações
- Criar uma página pública de redefinição de senha que reconheça o link recebido por e-mail, permita informar e confirmar uma nova senha e mostre mensagens claras de sucesso ou link inválido.
- Alterar “Esqueci minha senha” para enviar o usuário diretamente à nova página de redefinição.
- Preservar a conta `leandrobrum2009@gmail.com`, já confirmada e com permissão de administrador.
- Informar corretamente que `ncbrasil02@gmail.com` ainda não está cadastrado, sem criar conta ou conceder acesso administrativo automaticamente.
- Ajustar a tela de acesso para não recarregar incorretamente após cadastros que ainda aguardam confirmação por e-mail.
- Validar no Preview o envio da recuperação, a abertura da nova página e o acesso à tela administrativa após autenticação.

## Resultado esperado
O link de recuperação abrirá uma tela onde a nova senha pode ser definida. Depois disso, a conta administrativa poderá entrar normalmente e abrir o painel.

## Observação
A correção precisa ser publicada novamente para funcionar no domínio oficial.
