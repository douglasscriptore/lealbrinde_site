# Migração para API NestJS, Firestore e Cloud Run

## Estado da implementação em 20/07/2026

Concluído nesta primeira entrega executável:

- repositório independente `api-lealbrinde` inicializado;
- NestJS 11, configuração Zod, Swagger/OpenAPI, erros padronizados, request ID, throttling, logs e Sentry opcional;
- Firebase Admin por Application Default Credentials e Emulator Suite configurado;
- sessão Firebase, papéis, MFA TOTP da equipe e telas Firebase de login/cadastro/recuperação;
- catálogo público, busca inicial, DTF destacado, configurações e administração transacional básica de produtos;
- cálculo DTF validado nas oito fronteiras comerciais;
- carrinho assinado, cálculo autoritativo, personalização, estoque e restrição Pix para carrinho com DTF;
- checkout idempotente com retirada, snapshots, reservas e integração `/v2/payments`;
- webhook HMAC idempotente, compromisso/liberação de estoque e outbox com OIDC;
- pedidos do cliente, painel operacional, aprovação de arte e transições de produção/retirada;
- Rules, índices, Docker, GitLab CI inicial e OpenTofu validado para Cloud Run/Secrets/Scheduler;
- exportador SQLite e importador Firestore idempotente com checksum e feature flags desligadas;
- BFF do Next para sessão, carrinho, checkout e health, ativado somente quando a API for configurada;
- OpenAPI gerado e cliente tipado preparado no site;
- site legado preservado como rollback temporário enquanto a homologação não ocorre.

Pendente antes do corte definitivo:

- confirmar a localização ainda não criada do Firestore e autenticar o `gcloud`;
- criar versões reais dos segredos e publicar a primeira revisão no Cloud Run;
- concluir mídia de catálogo/Storage, upload privado de arte, documentos fiscais e Melhor Envio;
- migrar as consultas e ações restantes de catálogo/painel/conta para a API;
- executar importação real, configurar o webhook e homologar o Pix ponta a ponta;
- somente depois remover Better Auth e SQLite do runtime do Next.

## Objetivo e arquitetura final

Separar completamente apresentação e domínio. O Next.js continuará na Vercel como site e BFF fino; toda regra de catálogo, preço, estoque, permissão, carrinho, checkout e pedido ficará na nova API NestJS publicada no Cloud Run.

```text
Navegador
   ↓
Next.js / BFF
   ↓
lealbrinde-api / Cloud Run
   ├── Firebase Auth
   ├── Firestore
   ├── Firebase Storage
   ├── payment_api
   ├── Melhor Envio
   └── notificações
```

Decisões fixadas:

- Repositório independente: `../api-lealbrinde`.
- `api-cms` será somente referência arquitetural e permanecerá intocado.
- NestJS 11, Zod, Swagger, guards, throttling, interceptadores, Sentry e Docker.
- API versionada em `/v1`; OpenAPI em `/docs-json`.
- Next usa cliente gerado com `openapi-typescript` e `openapi-fetch`.
- Firestore Native Mode, Storage e Cloud Run em `southamerica-east1`.
- A região do Firestore deve ser confirmada antes da criação, pois é imutável.
- Projeto Firebase único de produção: `site-lealbrinde`; testes usam Emulator Suite.
- `payment_api` permanece como integração exclusiva com Mercado Pago.
- Nenhum dual write entre SQLite e Firestore.
- Migração inicial inclui somente catálogo e configurações. Pedidos, usuários, carrinhos, artes, documentos e pagamentos locais de homologação serão descartados.

## API e contratos

Módulos previstos:

- `auth`, `catalog`, `categories`, `pricing`, `carts`, `checkout`, `orders`;
- `artworks`, `inventory`, `production`, `fulfillment`, `fiscal`, `payments`;
- `customers`, `admin`, `audit`, `integrations`, `outbox` e `health`.

Contratos transversais:

```ts
type ApiError = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
```

- Datas públicas em ISO 8601 e persistidas como `Timestamp`.
- Dinheiro sempre em centavos.
- Mutações críticas exigem `Idempotency-Key`.
- Atualizações administrativas exigem `expectedVersion`; conflitos retornam 409.
- O Next pode validar formulários para feedback, mas a API repete todas as validações.

Superfície HTTP inicial:

- Público: catálogo, produto, categoria, busca, DTF destacado e configurações em `/v1/public/*`.
- Sessão: criar, encerrar e consultar sessão em `/v1/auth/*`.
- Carrinho, frete e checkout em `/v1/carts/current`, `/v1/shipping/quotes` e `/v1/checkout`.
- Cliente: pedidos, artes, Pix e documentos em `/v1/me/*`.
- Administração: catálogo, preço, estoque, pedidos, produção, documentos e auditoria em `/v1/admin/*`.
- Integrações: webhook de pagamento em `/v1/webhooks/payment-api` e outbox interno protegido por OIDC.

## Autenticação e autorização

- Firebase Auth com e-mail e senha para clientes e equipe.
- Cadastro público cria apenas `CUSTOMER`.
- E-mail verificado é obrigatório antes do checkout.
- Papéis em custom claims: `CUSTOMER`, `OPERATOR`, `FINANCE` e `ADMIN`.
- TOTP via Identity Platform é obrigatório para equipe.
- Promoção de equipe ocorre somente por administrador e revoga sessões existentes.
- O frontend recebe o ID token e o BFF o troca por Firebase session cookie.
- Cookie `__session`: `HttpOnly`, `Secure`, `SameSite=Lax`; até 14 dias para cliente e 8 horas para equipe com MFA confirmado.
- O site nunca autoriza pela interface; a API valida sessão, claims e MFA em toda operação.
- Firebase Admin usa Application Default Credentials no Cloud Run.
- A configuração web usa `NEXT_PUBLIC_FIREBASE_*`; Analytics não será inicializado nesta fase.

## Firestore

Coleções:

```text
users/{uid}
unique_keys/{namespace:value}
categories/{categoryId}
products/{productId}
products/{productId}/variants/{variantId}
price_tables/{priceTableId}
file_policies/{policyId}
production_policies/{policyId}
carts/{cartId}
orders/{orderId}
orders/{orderId}/items/{itemId}
orders/{orderId}/events/{eventId}
artwork_assets/{assetId}
fiscal_documents/{documentId}
payment_attempts/{attemptId}
shipping_quotes/{quoteId}
inventory_reservations/{reservationId}
inventory_movements/{movementId}
integration_events/{source:eventId}
audit_logs/{logId}
outbox_events/{eventId}
settings/commerce
catalog_migrations/{migrationId}
```

Regras:

- Leitura e escrita comercial direta pelo navegador serão negadas. A API usa Admin SDK.
- Slug, código e SKU usam documentos `unique_keys` criados na mesma transação.
- Tabelas publicadas são imutáveis e faixas ficam embutidas na versão.
- Itens de pedido preservam snapshots de produto, SKU, preço, personalização e frete.
- Busca inicial usa `searchTokens` e `searchPrefixes` normalizados.
- Atualizações removem valores `undefined` antes de persistir.

Checkout transacional:

1. API recalcula carrinho, personalização, estoque, frete e métodos de pagamento.
2. Uma transação valida versões, reserva estoque, cria pedido/itens, snapshots, evento, auditoria e outbox.
3. Após o commit, chama `POST /v2/payments` da `payment_api` com idempotência.
4. Segunda transação persiste tentativa e resultado.
5. Interrupção deixa `PAYMENT_CREATING`; processador idempotente retoma ou cancela e libera reservas.
6. Webhook HMAC usa `integration_events/{source:eventId}` para deduplicação e respeita a máquina de estados.

## Firebase Storage

- Catálogo: `public/products/{productId}/...`.
- Artes: `private/artworks/{uid}/{assetId}/...`.
- Documentos: `private/orders/{orderId}/documents/...`.
- A API inicia o upload e fornece URL temporária; o binário vai direto ao Storage.
- A conclusão confere objeto, tamanho, MIME, assinatura e checksum.
- Arquivos privados usam somente URLs assinadas curtas após autorização.
- Reenvio de arte sempre cria nova versão.
- Não haverá promessa de antivírus enquanto um scanner real não estiver configurado.

## Infraestrutura e publicação

Cloud Run inicial:

- Node 24, 1 vCPU, 512 MiB, concorrência 40, timeout 60s, mínimo 0 e máximo 10 instâncias.
- Artifact Registry, service account dedicada, Secret Manager, Cloud Scheduler, logs e alertas.
- HTTP acessível para o BFF, porém protegido por chave do site, sessão Firebase, papéis/MFA, HMAC ou OIDC conforme a rota.
- Segredos: chave BFF, URL/chave da `payment_api`, segredo HMAC, Sentry e futuras integrações.
- Permissões mínimas para Firestore, Auth, Storage, Secret Manager e logs.

Pipeline GitLab:

1. lint, typecheck e testes;
2. build e push da imagem;
3. plano/aplicação OpenTofu Google;
4. Rules e índices;
5. deploy de revisão no Cloud Run;
6. smoke test e promoção;
7. tags `vX.Y.Z` publicam produção.

## Migração do catálogo

Exportar do SQLite, somente leitura:

- 2 produtos, 1 categoria, configurações DTF/padrão, variantes, versões/faixas de preço, especificações, equipamentos, políticas, personalizações, estoque e configurações comerciais.
- Não exportar os 7 pedidos, 3 usuários, 3 carrinhos, eventos, arte, documento fiscal ou pagamentos locais.
- Preservar IDs, códigos, slugs e versões de preço.
- Copiar imagens para Storage e atualizar referências.

O importador será idempotente, terá `--dry-run`, checksum, projeto explícito, confirmação textual de produção e marcador `catalog_migrations/sqlite-catalog-v1`. Conflitos falham sem sobrescrita silenciosa. Durante a importação, `catalogEnabled=false` e `directCheckoutEnabled=false`.

## Migração do Next.js

- Introduzir cliente tipado da API.
- Trocar consultas SQLite por chamadas server-to-server.
- Preservar URLs, SEO, componentes e contratos visuais.
- Rotas atuais do site tornam-se proxies finos.
- Server Actions administrativas chamam a API autenticada.
- Cache público usa tags curtas e invalidação pontual após mutação confirmada.
- Ao final, remover Better Auth, `better-sqlite3`, repositórios/migrations/seeds de runtime, storage local e webhook financeiro no Next.

## Troca de produção

1. Confirmar `southamerica-east1` e criar Firestore, Auth, Storage e índices.
2. Criar primeiro `ADMIN` por script de bootstrap.
3. Publicar API com checkout desabilitado.
4. Exportar e importar catálogo.
5. Validar catálogo, preços e painel pela API.
6. Apontar webhook da `payment_api` ao Cloud Run.
7. Publicar site com BFF e Firebase Auth.
8. Fazer smoke de login, catálogo e carrinho.
9. Habilitar catálogo.
10. Homologar uma compra Pix ponta a ponta.
11. Habilitar checkout.
12. Remover o runtime SQLite logo após a homologação.

Rollback: desligar checkout, reverter revisões Cloud Run/Vercel e nunca devolver pedidos Firestore ao SQLite.

## Testes e aceite

- Auth, verificação de e-mail, recuperação, sessão, papéis e MFA.
- Unicidade e concorrência de catálogo/estoque.
- Publicação, arquivamento e preço imutável.
- DTF em 1, 5, 6, 10, 11, 99, 100 e 101 metros.
- Carrinho anônimo, mesclagem após login e carrinho misto Pix-only.
- Reserva, expiração, checkout e webhook idempotentes.
- Eventos duplicados/fora de ordem e falha parcial da `payment_api`.
- Revisão, produção, retirada, entrega, artes e documentos privados.
- Importação repetida sem duplicação.
- OpenAPI e contratos com `payment_api`.
- Fluxo completo produto → carrinho → login → checkout → Pix → webhook → conta → painel → aprovação → produção → retirada.
- Lint, TypeScript, testes, build, smoke Cloud Run e logs sem dados sensíveis.

Critério final: nenhuma regra comercial ou acesso direto a dados comerciais permanece no Next, e o site continua funcionando com a API como fonte única de verdade.
