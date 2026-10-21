# Instalação do primeiro caixa (CX01) — RS Supermercado

Endereço do caixa: **https://rssupermercado.com.br/pdv** (só depois que a versão atual for publicada).
Página de preparação: **https://rssupermercado.com.br/preparacao-caixa**

## Antes de começar
- Computador Windows com Google Chrome ou Microsoft Edge atualizado, internet estável.
- Leitor de código de barras USB (modo teclado, com Enter no final).
- Impressora térmica 80 mm instalada no Windows com o driver do fabricante e definida como **impressora padrão**.

## 1. Abrir o endereço correto
Abra o Chrome e digite `rssupermercado.com.br/pdv`. Confira o cadeado e o endereço. Crie um atalho na área de trabalho (menu ⋮ → Transmitir, salvar e compartilhar → Criar atalho → "Abrir como janela").

## 2. Cadastrar o computador como CX01
1. Entre com a conta de **administrador**.
2. Retaguarda → Terminais / Piloto: confira que o CX01 existe (ou cadastre-o). Ele fica "Aguardando autorização".
3. **Neste computador do caixa**, abra Preparação do Caixa, escolha CX01 e clique **Vincular este computador**.
   O computador recebe uma identificação própria; só ele poderá abrir o CX01. Se limpar os dados do navegador, será preciso vincular de novo.

## 3. Autorizar o operador
1. Admin → Cargos: dê ao funcionário o perfil **Operador de Caixa**.
2. Retaguarda → Terminais → Editar CX01 → marque o operador → Salvar.
O operador usa o próprio e-mail e senha; não salve senhas no navegador do caixa.

## 4. Abrir o caixa
Entre como operador → `/pdv` → confira "Este computador: CX01" → informe o fundo de troco → Abrir caixa. Clique em **Tela cheia**.
Antes da autorização de produção, use o **CX-PILOTO** para os testes (vendas marcadas como teste, sem baixa de estoque).

## 5. Testar o leitor
Preparação do Caixa → campo do leitor → passe 3 produtos. Deve aparecer o nome do produto e "velocidade de leitor ✓". Marque **Funcionou**.

## 6. Testar a impressão
Preparação do Caixa → Imprimir página de teste. Verifique corte, acentos e largura. Marque o resultado. Para imprimir sem a janela de confirmação, crie o atalho do Chrome com `--kiosk-printing` (documentado em PDV_HARDWARE_E_OPERACAO.md).

## 7. Venda de teste
No CX-PILOTO: passe 2 produtos, F8 → dinheiro com troco → imprima o cupom → reimprima (sai "2ª via"). Teste também um cartão com NSU. Marque **Abertura de sessão e venda de teste**.

## 8. Conferir o estoque
Retaguarda → Estoque / Inventário. Vendas do piloto não alteram o estoque. Antes da produção, faça o inventário físico (679 produtos estão com estoque zero; vendas reais desses produtos serão bloqueadas).

## 9. Fechar a sessão
No PDV → Fechar caixa → conte o dinheiro → informe → justifique diferenças → imprima o relatório. Marque **Fechamento de caixa de teste**.
Depois, o administrador autoriza o CX01 em Retaguarda → Terminais → **Autorizar produção** (o sistema recusa se faltar vínculo, operador ou testes).

## 10. Problemas comuns
| Sintoma | Solução |
|---|---|
| "Este computador não está cadastrado como CX01" | Vincular de novo em Preparação do Caixa (administrador). |
| "Operador não autorizado neste terminal" | Retaguarda → Terminais → Editar → marcar o operador. |
| "Terminal ainda não autorizado para produção" | Concluir testes e autorizar em Terminais. |
| "Você já possui um caixa aberto" | Feche o caixa aberto no outro terminal. |
| "Sem conexão" no topo | Verifique a internet; a venda não finaliza offline. Itens permanecem na tela. |
| Leitor não lê | Clique no campo de código; teste o leitor no Bloco de Notas; configure "Enter" como sufixo. |
| Cupom sai cortado/pequeno | Driver da impressora: papel 80 mm, margens zero; no Chrome, escala 100%. |
| Página antiga/erro após atualização | Ctrl + F5. |
| Produto sem estoque bloqueado | Faça a entrada/inventário na Retaguarda. |
