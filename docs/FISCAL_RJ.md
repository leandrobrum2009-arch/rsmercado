# Módulo fiscal — RS Supermercado (Teresópolis/RJ)

Situação: **emissão NÃO integrada.** Nenhum documento é transmitido à SEFAZ-RJ nem simulado. O PDV emite apenas cupom não fiscal.

## Arquitetura
- PDV → venda gravada → (futuro) servidor chama o adaptador do provedor fiscal (`src/lib/fiscal/provider.ts`). O PDV não fala com a SEFAZ e não conhece credenciais.
- Trocar de provedor = trocar o adaptador; vendas, documentos e eventos continuam iguais.
- `fiscal_documents`: venda, `request_id` único (idempotência), modelo 65/55, série/número, ambiente, status, chave de acesso, protocolo, XML, DANFE, código/mensagem de rejeição, tentativas. Um único documento ativo por venda e modelo; chave de acesso única.
- `fiscal_events`: histórico de comunicações, cancelamentos e rejeições (somente leitura para fiscal/auditoria; gravação apenas pelo servidor).
- Numeração separada para homologação e produção — testes nunca consomem numeração de produção.
- Produção só é ativada por `fiscal_approve_production` (administrador), que exige todos os itens do checklist. Gravação direta de "produção" é bloqueada no banco.
- Certificado (arquivo e senha), token CSC e chaves do provedor: somente segredos do servidor. Nunca no navegador, banco legível ou repositório.

## Dados que o supermercado/contador precisa fornecer
Razão social, nome fantasia, CNPJ, IE (RJ), IM, CNAE, CRT/regime, endereço fiscal completo com código IBGE do município, telefone; certificado digital (A1 recomendado para emissão em servidor); CSC e ID do CSC (gerados no portal da SEFAZ-RJ); séries de NFC-e (homologação e produção) e de NF-e se houver venda com NF-e mod. 55.

## Credenciamento
Confirmar em https://www4.fazenda.rj.gov.br/sefaz-dfe-consulta-credenciamento/paginas/consultaCnpj.faces se o CNPJ está credenciado para NFC-e/NF-e. Portal DF-e: https://portal.fazenda.rj.gov.br/dfe/ · Portal nacional: https://www.nfe.fazenda.gov.br/portal/principal.aspx

## Cadastro tributário dos produtos
Por produto: NCM, CEST (se aplicável), origem, CFOP, CST (regime normal) ou CSOSN (Simples), alíquota ICMS, CST PIS/COFINS, e campos da reforma tributária (CST IBS/CBS, cClassTrib) quando exigidos no período. O sistema valida apenas o **formato**; códigos e alíquotas vêm do contador. Hoje os 751 produtos estão pendentes.

## Provedor fiscal
A escolher (emissores com suporte a RJ via API). Custo típico: mensalidade + valor por documento; confirmar com fornecedores. Requisitos: API REST, homologação, consulta por identificador (para retomar pendências), cancelamento, contingência offline (EPEC/NFC-e off-line) e armazenamento do XML por 5 anos.

## Homologação (antes de produção)
1. Emitir NFC-e de teste em homologação (série de homologação).
2. Testar: venda simples, múltiplos itens, produto com ST, desconto, pagamentos combinados, rejeição proposital, reenvio do mesmo pedido (sem duplicar), queda de conexão e consulta posterior, cancelamento dentro do prazo, impressão do DANFE NFC-e com QR Code.
3. Contador revisa XMLs gerados.

## Implantação em produção
Checklist completo na Retaguarda → Fiscal → administrador aprova → primeiro caixa em produção acompanhado → conferência diária dos documentos rejeitados/pendentes.
