import "server-only";

import type {
  ArtworkReviewData,
  OperationsAlert,
  OperationsOrder,
  OperationsProduct,
  OrderTimelineEvent,
  PendingQueueItem,
  ProductEditorData,
  SemanticTone,
} from "@/components/operations";
import {
  validateDtfProductForPublication,
  type ArtworkVersion,
  type DtfProductAggregate,
  type Order,
  type PriceTable,
  type Product,
} from "@/domain";
import {
  ArtworkVersionRepository,
  FiscalDocumentRepository,
  isArtworkReadyForHumanReview,
  openDatabase,
  OrderRepository,
  PaymentAttemptRepository,
  ProductRepository,
} from "@/server/db";
import { requireStaff } from "@/server/auth/session";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function formatBrazilDateTimeLocal(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function currentPriceTable(aggregate: DtfProductAggregate): PriceTable | null {
  const now = new Date().toISOString();
  return (
    aggregate.priceTables.find(
      (table) =>
        table.status === "PUBLISHED" &&
        (!table.validFrom || table.validFrom <= now) &&
        (!table.validUntil || table.validUntil > now),
    ) ??
    aggregate.priceTables.find((table) => table.status === "DRAFT") ??
    aggregate.priceTables[0] ??
    null
  );
}

function mapProductSummary(
  product: Product,
  aggregate: DtfProductAggregate | null,
): OperationsProduct {
  const table = aggregate ? currentPriceTable(aggregate) : null;
  const minimumPrice = table?.tiers.length
    ? Math.min(...table.tiers.map((tier) => tier.unitPriceCents))
    : null;

  return {
    id: product.id,
    name: product.name,
    code: product.code,
    slug: product.slug,
    typeLabel: product.type === "DTF_BY_METER" ? "DTF por metro" : "Produto padrão",
    status: product.status,
    priceSummary:
      minimumPrice === null ? "Sem tabela" : `${formatMoney(minimumPrice)}/m`,
    updatedAtLabel: formatDateTime(product.updatedAt),
    featured: product.featured,
    editHref: `/admin/produtos/${product.id}`,
    previewHref:
      product.status === "ARCHIVED"
        ? undefined
        : product.slug.startsWith("/")
          ? product.slug
          : `/dtf/${product.slug}`,
  };
}

function resolveOrderStatus(order: Order): Pick<
  OperationsOrder,
  "status" | "statusLabel" | "requiresAction" | "actionLabel"
> {
  if (order.productionStatus === "CANCELLED") {
    return { status: "CANCELLED", statusLabel: "Cancelado" };
  }
  if (
    ["PICKED_UP", "DELIVERED"].includes(order.fulfillmentStatus) ||
    order.productionStatus === "COMPLETED"
  ) {
    return { status: "COMPLETED", statusLabel: "Concluído" };
  }
  if (order.fulfillmentStatus === "SHIPPED") {
    return { status: "SHIPPED", statusLabel: "Enviado" };
  }
  if (order.fulfillmentStatus === "READY_FOR_PICKUP") {
    return { status: "READY_FOR_PICKUP", statusLabel: "Pronto para retirada" };
  }
  if (order.productionStatus === "IN_PRODUCTION") {
    return { status: "IN_PRODUCTION", statusLabel: "Em produção" };
  }
  if (order.artworkStatus === "CHANGES_REQUESTED") {
    return {
      status: "CHANGES_REQUESTED",
      statusLabel: "Aguardando correção",
      requiresAction: true,
      actionLabel: "Ver correção",
    };
  }
  if (order.artworkStatus === "AUTO_REJECTED") {
    return {
      status: "ACTION_REQUIRED",
      statusLabel: "Arquivo bloqueado",
      requiresAction: true,
      actionLabel: "Ver problema",
    };
  }
  if (order.artworkStatus === "PENDING_REVIEW") {
    return {
      status: "ARTWORK_REVIEW",
      statusLabel: "Arte em revisão",
      requiresAction: true,
      actionLabel: "Revisar arte",
    };
  }
  if (order.paymentStatus === "PENDING_PIX" || order.paymentStatus === "DRAFT") {
    return { status: "PENDING_PAYMENT", statusLabel: "Pagamento pendente" };
  }
  if (order.artworkStatus === "APPROVED") {
    return { status: "APPROVED", statusLabel: "Arte aprovada" };
  }
  return { status: "IN_PRODUCTION", statusLabel: "Preparando produção" };
}

function mapOrderSummary(
  order: Order,
  products: Map<string, Product>,
  detailHref = `/admin/pedidos/${order.id}`,
): OperationsOrder {
  return {
    id: order.id,
    code: order.code,
    customerName: order.customerName,
    productName: products.get(order.productId)?.name ?? "Produto indisponível",
    quantityLabel: `${order.quantityMeters} m`,
    totalLabel: formatMoney(order.priceSnapshot.subtotalCents),
    updatedAtLabel: formatDateTime(order.updatedAt),
    detailHref,
    ...resolveOrderStatus(order),
  };
}

export async function getAdminProductList(
  search?: string,
): Promise<OperationsProduct[]> {
  await requireStaff(["ADMIN"]);
  const db = openDatabase();
  try {
    const repository = new ProductRepository(db);
    return repository.list({ search }).map((product) =>
      mapProductSummary(
        product,
        product.type === "DTF_BY_METER"
          ? repository.getDtfAggregate(product.id)
          : null,
      ),
    );
  } finally {
    db.close();
  }
}

const requiredPublicationChecks = [
  { code: "MISSING_IMAGE", label: "Imagem principal" },
  { code: "MISSING_SEO", label: "Conteúdo SEO" },
  { code: "INVALID_QUANTITY_RULE", label: "Quantidade mínima e incremento" },
  { code: "MISSING_PRINTABLE_WIDTH", label: "Largura útil de impressão" },
  { code: "MISSING_FILE_POLICY", label: "Política de arquivos" },
  { code: "UNCONFIRMED_FILE_POLICY", label: "Formatos e tamanho confirmados" },
  { code: "MISSING_PAYMENT_METHOD", label: "Pix exclusivo" },
  { code: "MISSING_FULFILLMENT", label: "Retirada ou entrega" },
  { code: "MISSING_PRODUCTION_POLICY", label: "Política de produção" },
  { code: "MISSING_PRICE_TABLE", label: "Tabela de preços publicada" },
  { code: "INVALID_PRICE_TABLE", label: "Faixas de preço válidas" },
  {
    code: "UNCONFIRMED_TECHNICAL_CLAIMS",
    label: "Alegações técnicas confirmadas",
  },
] as const;

export function mapProductEditorData(
  aggregate: DtfProductAggregate,
): ProductEditorData {
  const { product, configuration, filePolicy, productionPolicy } = aggregate;
  const now = new Date().toISOString();
  const table =
    aggregate.priceTables.find((candidate) => candidate.status === "DRAFT") ??
    aggregate.priceTables.find(
      (candidate) =>
        candidate.status === "PUBLISHED" &&
        Boolean(candidate.validFrom && candidate.validFrom > now),
    ) ??
    currentPriceTable(aggregate);
  const checklist = validateDtfProductForPublication(aggregate);
  const errorCodes = new Set(checklist.errors.map((issue) => issue.code));
  const galleryCover = product.gallery.find(
    (media) => media.url === product.mainImageUrl,
  );

  return {
    id: product.id,
    name: product.name,
    internalCode: product.code,
    slug: product.slug,
    summary: product.summary,
    description: product.description,
    type: product.type,
    status: product.status,
    featured: product.featured,
    unit: "metro",
    minimumMeters: configuration.minimumMeters,
    meterIncrement: configuration.meterIncrement,
    priceTableName: table ? `Versão ${table.version}` : "Nova versão",
    priceTableId: table?.id,
    priceTableStatus: table?.status,
    priceEffectiveFrom: table?.validFrom
      ? formatBrazilDateTimeLocal(table.validFrom)
      : undefined,
    priceTiers: (table?.tiers ?? []).map((tier) => ({
      id: tier.id,
      minimumMeters: tier.minimumMeters,
      maximumMeters:
        tier.maximumExclusiveMeters === null
          ? undefined
          : tier.maximumExclusiveMeters - 1,
      unitPriceCents: tier.unitPriceCents,
    })),
    priceHistory: aggregate.priceTables.map((historyTable) => ({
      id: historyTable.id,
      version: historyTable.version,
      status: historyTable.status,
      validFromLabel: historyTable.validFrom
        ? formatDateTime(historyTable.validFrom)
        : "Imediata",
      validUntilLabel: historyTable.validUntil
        ? formatDateTime(historyTable.validUntil)
        : undefined,
      tierCount: historyTable.tiers.length,
      active:
        historyTable.status === "PUBLISHED" &&
        (!historyTable.validFrom || historyTable.validFrom <= now) &&
        (!historyTable.validUntil || historyTable.validUntil > now),
    })),
    specifications: aggregate.specifications.map((specification) => ({
      id: specification.id,
      group: specification.group,
      title: specification.title,
      description: specification.description,
      position: specification.position,
      visible: specification.visible,
      confirmed: specification.confirmed,
    })),
    acceptedFormats: filePolicy?.acceptedExtensions ?? [],
    maximumFileSizeMb: filePolicy?.maximumFileSizeMb ?? undefined,
    printableWidthCm: configuration.printableWidthCm ?? undefined,
    recommendedDpi: filePolicy?.minimumResolutionDpi ?? undefined,
    requiresTransparentBackground:
      filePolicy?.requiresTransparentBackground ?? false,
    filePolicyConfirmed: filePolicy?.confirmed ?? false,
    backgroundPolicy: filePolicy
      ? filePolicy.requiresTransparentBackground
        ? "O arquivo deve ter fundo transparente."
        : "O fundo transparente não é obrigatório."
      : "Política ainda não configurada.",
    colorPolicy: filePolicy?.colorPolicy ?? "Política ainda não configurada.",
    filePreparationGuide:
      filePolicy?.preparationGuide ?? "Guia de preparação ainda não configurado.",
    equipment: aggregate.equipment.map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      quantity: equipment.quantity,
      metersPerHour: equipment.unitCapacityMetersPerHour,
    })),
    standardStartWithinBusinessHours:
      productionPolicy?.standardStartWithinBusinessHours ?? 24,
    customLeadTimeAboveMeters:
      productionPolicy?.customLeadTimeAboveMeters ?? 100,
    pickupEnabled: configuration.fulfillmentOptions.includes("PICKUP"),
    shippingEnabled: configuration.fulfillmentOptions.includes("SHIPPING"),
    pixExpirationMinutes: 30,
    refundPolicy: "A política de cancelamento e reembolso ainda precisa de confirmação.",
    coverImageUrl: product.mainImageUrl ?? undefined,
    coverImageAlt: galleryCover?.alt,
    media: product.gallery.map((media) => ({
      id: media.id,
      url: media.url,
      alt: media.alt,
      position: media.position,
    })),
    seoTitle: product.seo.title,
    seoDescription: product.seo.description,
    canonicalUrl: product.seo.canonicalPath,
    socialImageUrl: product.seo.socialImageUrl ?? undefined,
    publicationChecks: requiredPublicationChecks.map((check) => ({
      id: check.code,
      label: check.label,
      description: errorCodes.has(check.code)
        ? checklist.errors.find((issue) => issue.code === check.code)?.message
        : undefined,
      complete: !errorCodes.has(check.code),
    })),
  };
}

export async function getAdminDtfProduct(productId: string) {
  await requireStaff(["ADMIN"]);
  const db = openDatabase();
  try {
    const repository = new ProductRepository(db);
    const aggregate = repository.getDtfAggregate(productId);
    if (!aggregate) return null;
    const paymentPolicy = repository.getPaymentPolicy(productId);
    return {
      ...mapProductEditorData(aggregate),
      pixExpirationMinutes: paymentPolicy.pixExpirationMinutes,
      refundPolicy: paymentPolicy.refundPolicy,
    };
  } finally {
    db.close();
  }
}

export async function getAdminOrders(
  search?: string,
): Promise<OperationsOrder[]> {
  await requireStaff();
  const db = openDatabase();
  try {
    const productRepository = new ProductRepository(db);
    const productMap = new Map(
      productRepository.list().map((product) => [product.id, product]),
    );
    const term = search?.trim().toLocaleLowerCase("pt-BR");
    return new OrderRepository(db)
      .list()
      .filter(
        (order) =>
          !term ||
          order.code.toLocaleLowerCase("pt-BR").includes(term) ||
          order.customerName.toLocaleLowerCase("pt-BR").includes(term),
      )
      .map((order) => mapOrderSummary(order, productMap));
  } finally {
    db.close();
  }
}

export type AdminOrderDetail = {
  order: OperationsOrder;
  quantityMeters: number;
  standardStartWithinBusinessHours: number;
  customLeadTimeAboveMeters: number;
  canViewArtwork: boolean;
  canViewFiscal: boolean;
  paymentStatus: Order["paymentStatus"];
  artworkStatus: Order["artworkStatus"];
  productionStatus: Order["productionStatus"];
  fulfillmentStatus: Order["fulfillmentStatus"];
  fulfillmentMethod: Order["fulfillmentMethod"];
  paymentStatusLabel: string;
  artworkStatusLabel: string;
  productionStatusLabel: string;
  fulfillmentStatusLabel: string;
  fulfillmentMethodLabel: string;
  manualLeadTimeNote: string | null;
  timeline: OrderTimelineEvent[];
  artworkVersions: Array<{
    id: string;
    name: string;
    versionLabel: string;
    statusLabel: string;
    href: string;
  }>;
  paymentAttempts: Array<{
    id: string;
    status: string;
    amountLabel: string;
    updatedAtLabel: string;
  }>;
  fiscalDocumentCount: number;
  fiscalDocuments: Array<{
    id: string;
    title: string;
    versionLabel: string;
    uploadedAtLabel: string;
    downloadHref: string;
    current: boolean;
  }>;
};

const statusLabels = {
  payment: {
    DRAFT: "Rascunho",
    PENDING_PIX: "Pix pendente",
    PAID: "Pago",
    EXPIRED: "Expirado",
    FAILED: "Falhou",
    REFUNDED: "Reembolsado",
  },
  artwork: {
    UPLOADING: "Enviando",
    QUARANTINED: "Em quarentena",
    AUTO_REJECTED: "Bloqueada automaticamente",
    PENDING_REVIEW: "Aguardando revisão",
    CHANGES_REQUESTED: "Correção solicitada",
    APPROVED: "Aprovada",
  },
  production: {
    BLOCKED: "Bloqueada",
    QUEUED: "Na fila",
    IN_PRODUCTION: "Em produção",
    READY: "Pronta",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  },
  fulfillment: {
    PENDING: "Pendente",
    READY_FOR_PICKUP: "Pronta para retirada",
    SHIPPED: "Enviada",
    DELIVERED: "Entregue",
    PICKED_UP: "Retirada",
  },
} as const;

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const session = await requireStaff();
  const canViewArtwork = ["OPERATOR", "ADMIN"].includes(session.role);
  const canViewFiscal = ["FINANCE", "ADMIN"].includes(session.role);
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const order = orders.findById(orderId);
    if (!order) return null;
    const products = new ProductRepository(db);
    const productMap = new Map(
      products.list().map((product) => [product.id, product]),
    );
    const configuredPolicy = products.getDtfAggregate(order.productId)
      ?.productionPolicy;
    const standardStartWithinBusinessHours =
      configuredPolicy &&
      Number.isInteger(configuredPolicy.standardStartWithinBusinessHours) &&
      configuredPolicy.standardStartWithinBusinessHours > 0
        ? configuredPolicy.standardStartWithinBusinessHours
        : 24;
    const customLeadTimeAboveMeters =
      configuredPolicy &&
      Number.isInteger(configuredPolicy.customLeadTimeAboveMeters) &&
      configuredPolicy.customLeadTimeAboveMeters > 0
        ? configuredPolicy.customLeadTimeAboveMeters
        : 100;
    const events = orders.events(order.id);
    const artwork = canViewArtwork
      ? new ArtworkVersionRepository(db).listForOrder(order.id)
      : [];
    const payments = canViewFiscal
      ? new PaymentAttemptRepository(db).listForOrder(order.id)
      : [];
    const documents = canViewFiscal
      ? new FiscalDocumentRepository(db).listForOrder(order.id)
      : [];

    return {
      order: mapOrderSummary(order, productMap),
      quantityMeters: order.quantityMeters,
      standardStartWithinBusinessHours,
      customLeadTimeAboveMeters,
      canViewArtwork,
      canViewFiscal,
      paymentStatus: order.paymentStatus,
      artworkStatus: order.artworkStatus,
      productionStatus: order.productionStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      fulfillmentMethod: order.fulfillmentMethod,
      paymentStatusLabel: statusLabels.payment[order.paymentStatus],
      artworkStatusLabel: statusLabels.artwork[order.artworkStatus],
      productionStatusLabel: statusLabels.production[order.productionStatus],
      fulfillmentStatusLabel: statusLabels.fulfillment[order.fulfillmentStatus],
      fulfillmentMethodLabel:
        order.fulfillmentMethod === "PICKUP" ? "Retirada" : "Entrega",
      manualLeadTimeNote: order.manualLeadTimeNote,
      timeline: events.map((event) => ({
        id: event.id,
        title: event.description,
        occurredAtLabel: formatDateTime(event.createdAt),
        state: "complete" as const,
      })),
      artworkVersions: artwork.map((version) => ({
        id: version.id,
        name: version.originalFilename,
        versionLabel: `Versão ${version.version}`,
        statusLabel:
          version.reviewStatus === "PENDING"
            ? "Aguardando revisão"
            : version.reviewStatus === "APPROVED"
              ? "Aprovada"
              : version.reviewStatus === "CHANGES_REQUESTED"
                ? "Correção solicitada"
                : "Rejeitada",
        href: `/admin/artes/${version.id}`,
      })),
      paymentAttempts: payments.map((attempt) => ({
        id: attempt.id,
        status: attempt.status,
        amountLabel: formatMoney(attempt.amountCents),
        updatedAtLabel: formatDateTime(attempt.updatedAt),
      })),
      fiscalDocumentCount: canViewFiscal ? documents.length : 0,
      fiscalDocuments: documents.map((document) => ({
        id: document.id,
        title: document.type === "INVOICE" ? "Nota fiscal" : "Recibo",
        versionLabel: `Versão ${document.version}`,
        uploadedAtLabel: formatDateTime(document.createdAt),
        downloadHref: `/api/orders/${encodeURIComponent(order.code)}/documents/${encodeURIComponent(document.id)}/download`,
        current: document.isCurrent,
      })),
    };
  } finally {
    db.close();
  }
}

function findArtworkVersion(
  versionId: string,
): { version: ArtworkVersion; order: Order; product: Product | null } | null {
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const artworks = new ArtworkVersionRepository(db);
    const products = new ProductRepository(db);
    const version = artworks.findById(versionId);
    if (!version) return null;
    const order = orders.findById(version.orderId);
    if (!order) return null;
    return { version, order, product: products.findById(order.productId) };
  } finally {
    db.close();
  }
}

function checkTone(result: "passed" | "warning" | "failed"): SemanticTone {
  return result === "passed" ? "success" : result === "warning" ? "warning" : "danger";
}

function mapArtworkReview(
  version: ArtworkVersion,
  order: Order,
  product: Product | null,
): ArtworkReviewData {
  const scanResult =
    version.scanStatus === "CLEAN"
      ? "passed"
      : version.scanStatus === "PENDING"
        ? "warning"
        : "failed";
  const preflightResult =
    version.preflightStatus === "PASSED"
      ? "passed"
      : ["PENDING", "WARNING"].includes(version.preflightStatus)
        ? "warning"
        : "failed";

  return {
    versionId: version.id,
    orderId: order.id,
    orderCode: order.code,
    customerName: order.customerName,
    productName: product?.name ?? "Produto indisponível",
    quantityLabel: `${order.quantityMeters} m`,
    versionLabel: `Versão ${version.version}`,
    fileName: version.originalFilename,
    fileSizeLabel: `${(version.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
    submittedAtLabel: formatDateTime(version.createdAt),
    downloadHref: `/api/orders/${order.code}/artwork/${version.id}/download`,
    automaticChecks: [
      {
        id: "scan",
        label: "Verificação de segurança",
        result: scanResult,
        detail:
          version.scanStatus === "PENDING"
            ? version.metadata.validationMode === "homologation-signature-only"
              ? "Antimalware não configurado. A revisão está liberada somente nesta homologação local."
              : "A verificação ainda não foi concluída."
            : `Resultado registrado: ${version.scanStatus}.`,
      },
      {
        id: "preflight",
        label: "Validação mínima",
        result: preflightResult,
        detail: `Resultado registrado: ${version.preflightStatus}.`,
      },
    ],
  };
}

export async function getAdminArtworkReview(versionId: string) {
  await requireStaff(["OPERATOR", "ADMIN"]);
  const result = findArtworkVersion(versionId);
  if (!result) return null;
  const canReview =
    result.version.reviewStatus === "PENDING" &&
    isArtworkReadyForHumanReview(result.version) &&
    ["PASSED", "WARNING"].includes(result.version.preflightStatus) &&
    result.order.paymentStatus === "PAID";
  return {
    data: mapArtworkReview(result.version, result.order, result.product),
    reviewStatus: result.version.reviewStatus,
    canReview,
    lockedMessage: canReview
      ? undefined
      : result.version.reviewStatus !== "PENDING"
        ? "Esta versão já recebeu uma decisão e permanece disponível para consulta."
        : result.order.paymentStatus !== "PAID"
          ? "A revisão humana fica bloqueada até a confirmação do Pix."
          : "A revisão fica bloqueada até as validações mínimas confirmarem o arquivo.",
    tone: checkTone(
      result.version.reviewStatus === "APPROVED"
        ? "passed"
        : result.version.reviewStatus === "PENDING"
          ? "warning"
          : "failed",
    ),
  };
}

export async function getAdminArtworkQueue(): Promise<OperationsOrder[]> {
  await requireStaff(["OPERATOR", "ADMIN"]);
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const products = new ProductRepository(db);
    const artworks = new ArtworkVersionRepository(db);
    const productMap = new Map(
      products.list().map((product) => [product.id, product]),
    );

    return orders
      .list()
      .flatMap((order) => {
        const latest = artworks.listForOrder(order.id)[0];
        return latest ? [{ order, latest }] : [];
      })
      .filter(({ latest }) => latest.reviewStatus === "PENDING")
      .filter(
        ({ order, latest }) =>
          order.paymentStatus === "PAID" &&
          isArtworkReadyForHumanReview(latest) &&
          ["PASSED", "WARNING"].includes(latest.preflightStatus),
      )
      .map(({ order, latest }) =>
        mapOrderSummary(order, productMap, `/admin/artes/${latest.id}`),
      );
  } finally {
    db.close();
  }
}

export async function getAdminDashboardData() {
  await requireStaff();
  const db = openDatabase();
  try {
    const productsRepository = new ProductRepository(db);
    const ordersRepository = new OrderRepository(db);
    const artworkRepository = new ArtworkVersionRepository(db);
    const fiscalRepository = new FiscalDocumentRepository(db);
    const products = productsRepository.list();
    const orders = ordersRepository.list();
    const productMap = new Map(products.map((product) => [product.id, product]));

    const pendingReviews = orders.filter((order) => {
      const latest = artworkRepository.listForOrder(order.id)[0];
      return Boolean(
        latest &&
          order.paymentStatus === "PAID" &&
          latest.reviewStatus === "PENDING" &&
          isArtworkReadyForHumanReview(latest) &&
          ["PASSED", "WARNING"].includes(latest.preflightStatus),
      );
    }).length;
    const queues: PendingQueueItem[] = [
      {
        id: "artwork-review",
        label: "Artes para revisar",
        description: "Arquivos com validação concluída e decisão pendente.",
        count: pendingReviews,
        href: "/admin/artes",
        tone: pendingReviews ? "warning" : "success",
      },
      {
        id: "changes",
        label: "Correções do cliente",
        description: "Pedidos aguardando uma nova versão do arquivo.",
        count: orders.filter((order) => order.artworkStatus === "CHANGES_REQUESTED").length,
        href: "/admin/pedidos?status=correcao",
        tone: "warning",
      },
      {
        id: "production",
        label: "Fila de produção",
        description: "Pedidos aprovados que podem avançar na operação.",
        count: orders.filter((order) =>
          ["QUEUED", "IN_PRODUCTION"].includes(order.productionStatus),
        ).length,
        href: "/admin/producao",
        tone: "info",
      },
      {
        id: "pickup",
        label: "Prontos para retirada",
        description: "Pedidos disponíveis para confirmação de retirada.",
        count: orders.filter(
          (order) => order.fulfillmentStatus === "READY_FOR_PICKUP",
        ).length,
        href: "/admin/pedidos?status=retirada",
        tone: "success",
      },
      {
        id: "payment",
        label: "Pix pendentes",
        description: "Pedidos que ainda aguardam confirmação do pagamento.",
        count: orders.filter((order) => order.paymentStatus === "PENDING_PIX").length,
        href: "/admin/financeiro",
        tone: "warning",
      },
      {
        id: "fiscal",
        label: "Documentos fiscais",
        description: "Pedidos pagos que ainda não possuem documento fiscal atual.",
        count: orders.filter(
          (order) =>
            order.paymentStatus === "PAID" &&
            fiscalRepository.currentForOrder(order.id).length === 0,
        ).length,
        href: "/admin/financeiro",
        tone: "info",
      },
    ];

    const alerts: OperationsAlert[] = products.flatMap((product) => {
      if (product.type !== "DTF_BY_METER") return [];
      const aggregate = productsRepository.getDtfAggregate(product.id);
      if (!aggregate) return [];
      const checklist = validateDtfProductForPublication(aggregate);
      if (checklist.canPublish || product.status === "ARCHIVED") return [];
      return [
        {
          id: `publication-${product.id}`,
          title: `${product.name} ainda não pode ser publicado`,
          description: `${checklist.errors.length} itens obrigatórios precisam ser concluídos.`,
          tone: "warning" as const,
          href: `/admin/produtos/${product.id}`,
          actionLabel: "Revisar produto",
        },
      ];
    });

    return {
      queues,
      alerts,
      recentOrders: orders
        .slice(0, 6)
        .map((order) => mapOrderSummary(order, productMap)),
    };
  } finally {
    db.close();
  }
}
