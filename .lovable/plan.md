# PDV RS Supermercado — Auditoria e plano por etapas

## 1. Resultado da auditoria (sem alterações no sistema)

O que já existe e funciona:
- Site e loja online com carrinho, pedidos, entrega, cashback, fidelidade e encartes.
- Cadastro de produtos real: **751 produtos ativos**, com preço, preço promocional, custo, estoque, unidade e marca. **124 produtos vendidos por peso.**
- Fornecedores (5 cadastrados) e pedidos de compra (1 registro).
- Login de usuários e papéis (administrador / moderador / usuário) guardados em tabela separada, com permissões por área do painel.
- API de integração com chaves de acesso, histórico e webhooks.

O que NÃO existe hoje:
- Nenhuma estrutura de caixa: sem terminais, sessões de caixa, vendas de balcão, sangria/suprimento ou fechamento.
- Nenhum histórico de movimentação de estoque (o estoque é só um número no produto; a loja online desconta direto).
- Nenhuma emissão fiscal (NFC-e).

Riscos encontrados:
- **Nenhum produto tem código de barras cadastrado (0 de 751).** O leitor não vai encontrar nada até os códigos serem preenchidos. Será preciso uma tela de cadastro rápido de código (bipar o produto e vincular) ou importar uma planilha do sistema atual.
- O estoque é compartilhado entre loja online e caixa; sem um histórico de movimentações, diferenças não terão explicação.
- Emissão de NFC-e exige certificado digital A1, CSC da SEFAZ e um serviço emissor contratado — não é possível emitir só com o sistema.

## 2. Etapas de implementação

Etapa 1 — Base do caixa (primeiro caixa de teste)
- Cadastro de terminais (Caixa 01) e papel "operador de caixa".
- Abertura de caixa com fundo de troco; bloqueio de duas sessões no mesmo terminal.
- Sangria, suprimento e reforço com motivo e autorização.
- Fechamento com conferência (opção de fechamento cego), divergência justificada, relatório e histórico. Sessões fechadas não podem ser alteradas.

Etapa 2 — Tela de venda (PDV)
- Nova página "Frente de Caixa", tela cheia, feita para teclado e leitor USB (campo sempre focado).
- Busca por código de barras, código interno ou nome; quantidade fracionada para itens de peso.
- Alterar quantidade, excluir item e desconto com senha de supervisor quando exigido.
- Suspender/recuperar venda, consulta de preço sem perder a venda, cancelamento.
- Atalhos F1–F10 e ESC conforme o documento, com proteção contra clique/tecla duplicada.
- Todos os totais recalculados e validados no servidor.

Etapa 3 — Pagamento e finalização
- Dinheiro (com troco), PIX, cartão débito/crédito (lançamento manual do comprovante da maquininha no início), pagamento misto.
- Baixa de estoque com registro de movimentação, venda vinculada ao operador e à sessão.
- Cupom não fiscal para impressão térmica (80mm) enquanto a parte fiscal não está pronta.

Etapa 4 — Retaguarda e estoque
- Histórico de movimentações de estoque (venda PDV, venda online, entrada de compra, ajuste, perda).
- Tela de vínculo rápido de código de barras e importação por planilha.
- Relatórios: vendas por dia/operador/forma de pagamento, produtos mais vendidos.

Etapa 5 — Fiscal (NFC-e)
- Integração com um emissor (ex.: Focus NFe, NFE.io ou PlugNotas), contingência e cancelamento.
- Depende de: certificado A1, CSC, regime tributário e dados fiscais por produto (NCM, CFOP, CST/CSOSN).

## 3. O que preciso de você antes das etapas 4–5
- Planilha de produtos com códigos de barras, se o sistema atual permitir exportar.
- Qual emissor fiscal contratar (ou se já existe contador/serviço) e o certificado A1.

## Detalhes técnicos
- Novas tabelas: `pos_terminals`, `pos_sessions`, `pos_cash_movements`, `pos_sales`, `pos_sale_items`, `pos_payments`, `pos_audit_log`, `stock_movements`; novo papel `cashier` no enum `app_role` e permissões em `user_roles.permissions`.
- RLS por `has_role`; inserts de venda/fechamento apenas por funções no servidor (`createServerFn` + `requireSupabaseAuth`) que recalculam preços a partir de `products`; baixa de estoque transacional em função SQL `security definer`.
- Índice único parcial para impedir duas sessões abertas por terminal; índice em `products.barcode`.
- Rota `/_authenticated/pdv` com layout próprio (sem cabeçalho da loja); nenhuma tabela existente é removida ou renomeada.
