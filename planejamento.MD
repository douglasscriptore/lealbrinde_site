# Planejamento v3 - Catálogo próprio e modernização comercial completa

## Objetivo

Evoluir a Leal Brinde para um e-commerce próprio em Next.js, preservando o DTF existente e a linguagem premium clara baseada em Tailwind 4 e Motion.

Decisões confirmadas:

- Produtos comuns serão comprados diretamente no site.
- DTF e produtos comuns poderão coexistir no mesmo carrinho.
- Carrinho com qualquer item DTF aceitará somente Pix.
- Carrinho sem DTF aceitará Pix e cartão.
- Produtos personalizados serão pagos antes da revisão humana.
- O pedido será enviado junto quando todos os itens estiverem prontos.
- Frete nacional será calculado pelo Melhor Envio e retirada local será gratuita.
- Login será obrigatório antes do checkout.
- Produtos, variações, preços, estoque, personalização e frete serão gerenciados pelo painel.
- Não haverá importação, avaliações próprias, analytics, CMS externo ou Storybook nesta etapa.
- A Shopee ficará apenas no rodapé como canal secundário.

## Experiência pública

O tema permanece fixo em modo claro, com branco, azul-gelo, grafite e turquesa. Tailwind semântico será a fonte principal dos estilos, com fotografia real, bordas finas, sombras azuladas e movimento restrito a transformações e opacidade. Marketing terá movimento expressivo e as superfícies operacionais usarão animações apenas como feedback.

Rotas principais:

- `/produtos`: catálogo com categorias, busca, filtros, ordenação e paginação.
- `/produtos/[slug]`: página rica do produto.
- `/categorias/[...slug]`: páginas comerciais indexáveis.
- `/busca?q=`: busca por nome, código, conteúdo e atributos.
- `/carrinho`: carrinho misto persistente.
- `/checkout`: fluxo protegido por autenticação.
- `/brindes`: entrada para o catálogo próprio.
- `/pulseiras-e-cordoes`: pré-lançamento até existirem produtos publicados.

A home priorizará catálogo, categorias, produtos selecionados, DTF, pulseiras e cordões, processo de personalização, produção, retirada, entrega e FAQ. O bloco da Shopee sai da home e de Brindes. O rodapé mantém um link compacto e a prova manual de mais de 4 mil vendas, sem estrelas ou avaliações.

Busca pública usará SQLite FTS5. Filtros serão derivados dos atributos cadastrados e representados na URL. A página de produto terá galeria, variações, quantidade, preço por faixa, personalização, prazo, estoque, frete, retirada, especificações e CTA móvel. Preços serão públicos e dados estruturados serão emitidos apenas com informações reais.

## Catálogo e administração

O catálogo terá produtos padrão e DTF. Produtos padrão terão opções administráveis, variantes por combinação, SKU, preço base, mínimo, incremento, estoque controlado ou fabricação sob encomenda, peso, dimensões e estado de publicação.

Personalização:

- `NONE`: sem personalização.
- `STRUCTURED_FIELDS`: texto, texto longo, seleção, número, cor e observação.
- `ARTWORK_UPLOAD`: arquivo privado com preflight, versões e revisão humana.

Preços por quantidade serão versionados. Pedidos guardarão snapshots imutáveis de produto, variante, faixa, personalização e valores. Produtos publicados com entrega deverão possuir peso e dimensões. Produtos sem preço determinável não poderão ser publicados para compra direta.

O painel terá categorias, coleções, produtos, variantes, preços, estoque, personalizações, mídia, SEO, publicação, pedidos, produção por item, artes, pagamentos, reembolsos, Melhor Envio, documentos fiscais, auditoria e integrações.

Permissões:

- `OPERATOR`: pedidos, artes, produção e entrega.
- `FINANCE`: pagamentos, documentos e reembolsos.
- `ADMIN`: catálogo, preços, estoque, configurações e integrações.

## Carrinho e pedidos

O carrinho poderá começar anonimamente usando cookie assinado e `HttpOnly`. Depois do login ele será vinculado ou mesclado à conta. O servidor recalculará preço, estoque e frete antes do pagamento.

O pedido será uma entidade principal com múltiplos itens. Pagamento e entrega ficam no pedido. Arte e produção ficam por item. Se houver DTF, o pedido inteiro aceitará apenas Pix. Sem DTF, aceitará Pix e cartão quando a integração estiver ativa. A expedição só será liberada quando todos os itens estiverem prontos.

Estoque controlado será reservado ao iniciar o pagamento e liberado em falha, expiração ou cancelamento. Mudanças após pagamento nunca recalcularão silenciosamente: exigirão cancelamento, reembolso ou novo pedido.

## Pagamentos e logística

A `payment_api` continuará como integração única com Mercado Pago. Será adicionado um contrato v2 para múltiplos itens, preservando o endpoint legado de produto único. O site recalculará o pedido e enviará um snapshot congelado com idempotência. Cartões serão tokenizados no navegador com MercadoPago.js. A `payment_api` enviará eventos assinados por HMAC e o site processará eventos duplicados ou fora de ordem de forma idempotente.

A administração terá máximo de parcelas, opções auxiliares, descritor da fatura, ativação de cartão e prévia de parcelamento. Essas configurações serão acessadas por rotas administrativas autenticadas da `payment_api`. A taxa de serviço da Leal permanecerá zero.

O Melhor Envio receberá origem, destino e os dados físicos dos itens. A cotação escolhida será armazenada e revalidada antes do pagamento. Compra e geração da etiqueta serão ações administrativas depois que todos os itens estiverem prontos. Retirada local não exigirá cotação.

## Migração do DTF

- Criar `order_items` e converter cada pedido DTF existente em um item.
- Preservar temporariamente as colunas antigas como compatibilidade somente leitura.
- Associar novas artes ao item do pedido.
- Migrar estados de arte e produção para o item.
- Preservar snapshots, pagamentos, documentos, eventos, códigos e URLs.
- Remover campos legados apenas depois da validação de paridade.

## Etapas de implementação

1. Registrar este planejamento e criar migrações compatíveis.
2. Implementar domínio, repositórios e regras de catálogo, carrinho e pedidos.
3. Construir catálogo público, busca, filtros, PDP e carrinho.
4. Construir a administração de produtos padrão, estoque e personalização.
5. Evoluir a `payment_api` e validar Pix e cartão em sandbox sem quebrar clientes existentes.
6. Integrar Melhor Envio em sandbox, retirada, etiquetas e rastreamento.
7. Migrar pedidos DTF, executar piloto e liberar catálogo e checkout por feature flags.

## Validação

Testes obrigatórios cobrirão preços e faixas, variantes, carrinho misto, restrição Pix para DTF, cartão para produtos padrão, estoque concorrente, personalização, versões de arte, expedição consolidada, retirada, frete, Pix expirado, cartão recusado, webhooks duplicados, reembolsos, compatibilidade da `payment_api`, histórico DTF, autorização, acessibilidade, SEO e responsividade.

Metas: LCP abaixo de 2,5 s, CLS abaixo de 0,1 e INP abaixo de 200 ms. A entrega final deve passar TypeScript, ESLint, testes, build e validação visual com Node 24.18.0.
