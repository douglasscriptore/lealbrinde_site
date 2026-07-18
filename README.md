# Leal Brinde

Aplicação Next.js para o site institucional, produto DTF por metro, checkout, área do cliente e operação administrativa.

## O que está implementado

- Site público responsivo com home, setores, conteúdo institucional, SEO, sitemap e página dinâmica para cada produto DTF publicado.
- Produto DTF cadastrável com checklist de publicação, especificações, equipamentos, arquivo, produção, pagamento, mídia e SEO.
- Tabelas de preço imutáveis e versionadas, com vigência imediata ou agendada e snapshot no pedido.
- Calculadora por metragem com todos os limites aprovados e aviso transparente entre 99 e 100 metros.
- Checkout local, upload privado, verificação de e-mail, Pix de homologação e dados fiscais.
- Portal do cliente com timeline, correções versionadas, retirada, entrega e documentos.
- Operação de pedidos, revisão de arte, reembolso, documentos fiscais, auditoria e acesso separado por papel.
- Autenticação passwordless para clientes e senha com TOTP obrigatório para a equipe.

## Rodar localmente

Requisitos: Node.js 20.9 ou superior e pnpm 10.

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Abra `http://localhost:3000`.

O seed cria o produto DTF inicial, as quatro faixas de preço, equipamentos, especificações em validação, pedidos demonstrativos e o usuário administrativo definido no arquivo local de ambiente.

No primeiro acesso em `/admin/entrar`, o administrador é direcionado para ativar o TOTP antes de abrir o painel. O seed nunca promove uma conta preexistente: se o e-mail configurado já pertencer a uma conta que não seja o administrador criado pelo bootstrap, ele interrompe com erro.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e troque todos os valores sensíveis. O arquivo `.env.local` não entra no Git.

As integrações `mock`, `local`, `console` e `mock-signature` existem somente para desenvolvimento. A verificação de saúde retorna `503` em produção enquanto qualquer uma delas estiver ativa.

Produtos em rascunho não aceitam pedidos. Para exercitar o checkout local antes de concluir o checklist de publicação, use conscientemente `ALLOW_DRAFT_CHECKOUT=true` no `.env.local`. Esse escape é ignorado em produção.

## Comandos de qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:backup
```

## Estado de homologação

- O preço usa a tabela publicada no banco e é sempre recalculado no servidor.
- O Pix local não movimenta dinheiro e não exibe QR Code falso.
- O upload local aceita provisoriamente PNG, PDF e TIFF de até 10 MB.
- O upload local limita frequência, lê no máximo 11 MB por requisição, reserva até 250 MB e remove arquivos não vinculados depois de 24 horas.
- A checagem de arquivo local valida somente assinatura e integridade básica. Não substitui antimalware.
- A entrega permanece bloqueada até existir cálculo final de frete.
- O produto começa como rascunho e não é indexado enquanto largura útil, política de arquivo, mídia e alegações técnicas não forem confirmadas.
- O armazenamento local é privado, mas precisa ser substituído por object storage antes do lançamento.
- O envio de magic link aparece no terminal local e precisa de um provedor transacional em produção.
- As imagens editoriais atuais são provisórias. Antes do lançamento, substitua-as por fotos reais da produção e forneça a logo em SVG ou alta resolução.

## Antes de publicar

Ainda precisam ser escolhidos e conectados os provedores reais de Pix, e-mail, object storage, antimalware e frete. Também faltam as confirmações do cliente sobre largura útil, formatos, limite do arquivo, parâmetros de aplicação, política fiscal e alegações técnicas. Enquanto qualquer integração local estiver ativa, `/api/health` responde `503` em produção e o checkout produtivo permanece bloqueado.

Os módulos administrativos diretamente necessários ao DTF estão operacionais. Conteúdo global, estoque, relatórios avançados, convites de equipe e integrações fiscais continuam como fases posteriores, sem alterar o WooCommerce existente.

O plano consolidado e os critérios de aceite estão em [planejamento.MD](./planejamento.MD).
