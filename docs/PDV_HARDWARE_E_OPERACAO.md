# PDV — Hardware, piloto e contingência

## Hardware (o navegador NÃO controla todos os periféricos)
| Equipamento | Situação atual | Dependência para integração completa |
|---|---|---|
| Leitor de código de barras USB | Funciona (modo teclado + Enter) | Nenhuma |
| Impressora térmica 80mm | Impressão de cupom NÃO fiscal pelo diálogo do navegador (Windows: definir a térmica como padrão; Chrome em `--kiosk-printing` evita o diálogo) | Impressão silenciosa/ESC-POS exige serviço local (ex.: QZ Tray) — não implementado |
| Gaveta de dinheiro | Abre pela impressora se o driver estiver configurado para "abrir gaveta ao imprimir" | Comando direto exige serviço local |
| Balança comercial | Peso digitado manualmente (F6) em produtos por peso; etiquetas EAN-13 de balança dependem do padrão da balança | Leitura serial/USB exige serviço local + modelo/protocolo da balança |
| Terminal de pagamento (TEF/POS) | Lançamento manual com NSU obrigatório | Credenciais e SDK do adquirente/TEF contratado |
| Documento fiscal (NFC-e) | Não emitido | Provedor fiscal, certificado A1, CSC e homologação SEFAZ |

Arquitetura: a aplicação web nunca fala direto com dispositivos; integrações futuras passam por um serviço local instalado no caixa, documentado e aprovado antes da implementação.

## Piloto / testes
- Terminal **CX-PILOTO** (marcado como teste): vendas gravadas com `is_test`, sem baixa de estoque, fora dos relatórios por padrão, cupom com aviso "VENDA DE TESTE".
- Terminais reais só abrem caixa após autorização do administrador em Retaguarda → Terminais / Piloto (registrado em auditoria).
- Roteiro de testes: leitura de código, 1 e vários itens, peso fracionado, desconto com PIN, pagamento combinado, troco, PIX/cartão com NSU, suspender/recuperar (F3), cancelar item (F9), falha de pagamento (NSU repetido é recusado), reimpressão, abertura/fechamento, sangria/suprimento, divergência de fechamento, devolução, clique duplo em finalizar (idempotente), queda de conexão.

## Sem internet
- Finalização bloqueada offline com aviso ao operador; itens permanecem na tela; suspender (F3) após a volta da conexão.
- Não há venda fiscal offline (contingência legal não implementada). Nenhum dado sensível é guardado no navegador.
