# Planejamento consolidado v2: Leal Brinde e produto DTF cadastrável

## 1. Objetivo

Construir uma plataforma nova em Next.js com site comercial, produto DTF cadastrável, cálculo por metragem, Pix, revisão de arte, acompanhamento do pedido, documentos fiscais e painel administrativo. O site atual continuará intocado até uma decisão específica sobre migração ou convivência.

Decisões confirmadas:

- O DTF será um produto cadastrado no painel, não uma configuração global fixa.
- O preço será aplicado pela faixa total atingida.
- A quantidade será informada somente em metros inteiros.
- O Pix será gerado após a validação automática mínima e antes da revisão humana.
- Pedidos de até 100 metros entram em produção em até 24 horas úteis após Pix confirmado e arte aprovada.
- Pedidos acima de 100 metros terão prazo manual conforme a fila.
- A queda de R$ 3.158,10 em 99 metros para R$ 2.790,00 em 100 metros será mantida e comunicada com transparência.
- Next.js é a única tecnologia fixada antecipadamente. Provedores externos serão ligados por adaptadores.

## 2. Estrutura do produto

Cada produto terá nome, slug, código, tipo, resumo, descrição, capa, galeria, estado, destaque, ordem, atendimento, pagamentos, SEO, publicação e histórico. Os estados serão `DRAFT`, `PUBLISHED` e `ARCHIVED`. Os tipos iniciais serão `DTF_BY_METER` e `STANDARD_PRODUCT`.

Produtos DTF terão configuração própria:

```ts
type DtfProductConfiguration = {
  productId: string;
  minimumMeters: number;
  meterIncrement: number;
  pricingMode: "VOLUME_TOTAL";
  paymentMethods: ["PIX"];
  printableWidthCm: number;
  filePolicyId: string;
  productionPolicyId: string;
  fulfillmentOptions: Array<"PICKUP" | "SHIPPING">;
};
```

O sistema aceitará múltiplos produtos DTF, mas somente um poderá ser o destaque principal da home.

## 3. Produto inicial

- Nome: `DTF Têxtil por Metro`
- Slug: `/dtf/textil-por-metro`
- Tipo: `DTF_BY_METER`
- Unidade: metro
- Mínimo e incremento: 1 metro
- Pagamento: Pix
- Atendimento: retirada ou entrega
- Revisão humana obrigatória após o pagamento
- Estado inicial: rascunho até a confirmação das regras de arquivo

### Tabela de preços

| Quantidade | Valor unitário | Regra interna |
|---|---:|---|
| 1 a 5 m | R$ 39,90 | `min: 1`, `maxExclusive: 6`, `unitPrice: 3990` |
| 6 a 10 m | R$ 34,90 | `min: 6`, `maxExclusive: 11`, `unitPrice: 3490` |
| 11 a 99 m | R$ 31,90 | `min: 11`, `maxExclusive: 100`, `unitPrice: 3190` |
| 100 m ou mais | R$ 27,90 | `min: 100`, `maxExclusive: null`, `unitPrice: 2790` |

O subtotal será `quantidadeEmMetros * valorUnitarioDaFaixa`. A calculadora destacará que 100 metros custam menos que 99 e oferecerá a troca sem alterar a quantidade automaticamente.

Tabelas publicadas serão imutáveis. Mudanças criarão uma nova versão com vigência. O pedido guardará um snapshot do produto, faixa, valor unitário e total.

## 4. Conteúdo técnico e produção

As especificações serão blocos estruturados e ordenáveis, agrupados em filme, adesivo, impressão e compatibilidade. O cadastro inicial incluirá PET Premium Hot Peel, 75 micras, Double Matte, revestimento microporoso, TPU Premium, cabeças Epson i3200, resolução de até 720 x 1440 DPI, perfis ICC e compatibilidade com algodão, poliéster e tecidos mistos.

As alegações permanecerão como conteúdo administrável e deverão ser confirmadas pela Leal Brinde antes da publicação. Não serão inventadas fontes, certificações, parâmetros de prensa ou quantidade de lavagens.

Equipamentos iniciais:

| Quantidade | Equipamento | Produção unitária |
|---:|---|---:|
| 2 | Impressora DTF | 27 m/h |
| 1 | Impressora DTF | 11 m/h |

A capacidade nominal será calculada como 65 m/h. Ela não será usada automaticamente para prometer uma data de conclusão.

Política de produção:

```ts
type ProductionPolicy = {
  startTrigger: "PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED";
  standardStartWithinBusinessHours: 24;
  customLeadTimeAboveMeters: 100;
  largeOrderMode: "MANUAL_CONFIRMATION";
};
```

## 5. Página pública do produto

A página terá hero com CTA para calcular, tabela de preços, calculadora com total, especificações agrupadas, capacidade nominal, compatibilidade, diferenciais, retirada ou entrega, guia do arquivo, FAQ e CTA final.

Mensagem principal: `Produção própria, filme Premium Hot Peel e impressão em alta definição para algodão, poliéster e tecidos mistos.`

O site exibirá preço por metro e total simultaneamente. Nunca mostrará apenas `a partir de R$ 27,90` sem explicar a faixa mínima.

## 6. Editor administrativo

O cadastro do produto será dividido nas abas Básico, Preço, Especificações, Arquivos, Produção, Pagamento, Mídia, SEO e Publicação. O administrador poderá criar, duplicar, pré-visualizar, publicar e arquivar produtos.

A publicação será bloqueada se faltar tabela válida, mínimo, política de arquivo, largura útil, pagamento, produção, capa ou SEO básico. Produtos com pedidos nunca poderão ser excluídos, somente arquivados.

## 7. Fluxo do pedido DTF

1. Cliente escolhe a metragem.
2. Sistema seleciona a faixa e calcula o total.
3. Cliente escolhe retirada ou entrega.
4. Para entrega, o frete final é calculado antes do Pix.
5. Cliente envia um arquivo pronto.
6. Sistema valida formato, assinatura, tamanho e integridade.
7. Cliente informa dados pessoais e fiscais.
8. Cliente verifica o e-mail.
9. Servidor recalcula e cria o Pix.
10. Webhook confirma o pagamento.
11. Operador revisa e aprova ou solicita correção.
12. Reenvio cria nova versão do arquivo.
13. Pedido pago e aprovado entra em produção.
14. Cliente acompanha retirada ou entrega e acessa a nota fiscal.

Escopo inicial: um arquivo por pedido, versões de substituição, sem editor de gang sheet, sem correção por IA, sem cartão e sem Bling.

## 8. Estados e invariantes

Pagamento: `DRAFT`, `PENDING_PIX`, `PAID`, `EXPIRED`, `FAILED`, `REFUNDED`.

Arte: `UPLOADING`, `QUARANTINED`, `AUTO_REJECTED`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`.

Produção: `BLOCKED`, `QUEUED`, `IN_PRODUCTION`, `READY`, `COMPLETED`, `CANCELLED`.

Entrega: `PENDING`, `READY_FOR_PICKUP`, `SHIPPED`, `DELIVERED`, `PICKED_UP`.

- Não gerar Pix antes da validação mínima do arquivo.
- Não produzir antes de `PAID` e `APPROVED`.
- Reenvio sempre cria uma versão.
- Ações administrativas geram auditoria.
- Mudanças que afetem um pedido pago exigem cancelamento ou reembolso conforme política e criação de pedido corrigido.

## 9. Site, cliente e administração

A home apresentará Brindes, DTF por metro e Pulseiras e Cordões. DTF será a entrada principal, Brindes terá destino configurável e Pulseiras permanecerá como setor em desenvolvimento.

A área do cliente mostrará pendências, pedidos em andamento, concluídos e rascunhos. O detalhe terá timeline, Pix, arquivos, correções, produção, entrega, dados fiscais, documentos e recompra.

O painel incluirá visão geral, produtos, categorias, DTF, pedidos, artes, produção, logística, financeiro, fiscal, clientes, estoque, conteúdo, SEO, relatórios, usuários, auditoria, integrações e feature flags.

Papéis iniciais: `CUSTOMER`, `OPERATOR`, `FINANCE` e `ADMIN`.

## 10. Arquitetura

Aplicação Next.js App Router como monólito modular, com Server Components por padrão, banco relacional, armazenamento privado, filas, outbox e integrações por adaptadores. As portas principais serão `PaymentGateway`, `ObjectStorage`, `FileScanner`, `ShippingProvider`, `NotificationService`, `CommerceConnector`, `FiscalIntegration` e `Analytics`.

Dinheiro será armazenado em centavos. A quantidade do produto inicial será inteira. Todo cálculo será repetido no servidor.

## 11. Segurança, SEO e operação

- Autenticação por biblioteca mantida e MFA para equipe.
- Autorização no servidor e isolamento por propriedade.
- Arquivos privados, quarentena, verificação de MIME e antimalware.
- Webhooks validados e idempotentes.
- Logs sem dados pessoais, Pix ou conteúdo das artes.
- Backups e auditoria.
- Páginas públicas indexáveis e áreas transacionais com `noindex`.
- Metadata, canonical, sitemap, robots, Open Graph e dados estruturados.
- O site legado permanecerá intocado até um projeto específico de migração.

## 12. Fases e critérios de aceite

1. Fundação, ativos e confirmação das regras comerciais.
2. Site público, produto cadastrável, SEO e calculadora.
3. Upload, autenticação, checkout, Pix, portal e revisão de arte.
4. Operação administrativa, logística, fiscal, catálogo e estoque.
5. Segurança, acessibilidade, performance, piloto e lançamento gradual.
6. Decisão futura sobre convivência ou migração do WooCommerce.

Testes cobrirão limites de preço, rejeição de frações, degrau de 99 para 100 metros, versionamento, publicação, Pix, webhooks, arquivos, correções, papéis, propriedade, acessibilidade, responsividade, SEO, backups e reprocessamento.

O MVP será aceito quando o produto puder ser cadastrado, pré-visualizado, publicado, duplicado e arquivado; preços forem versionados e recalculados no servidor; Pix for exclusivo; pedido só produzir após pagamento e aprovação; e cliente e equipe conseguirem acompanhar todo o processo sem acesso manual ao banco.
