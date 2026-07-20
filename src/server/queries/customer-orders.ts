import "server-only";

import {
  deriveCustomerOrderStatus,
  type ArtworkVersion,
  type CustomerOrderStatus,
  type Order,
  type OrderEvent,
  type OrderItem,
} from "@/domain";
import type {
  CustomerActionItem,
  CustomerOrderDetailData,
  CustomerOrderSummary,
  OrderTimelineEvent,
  SemanticTone,
} from "@/components/operations";
import {
  ArtworkVersionRepository,
  FiscalDocumentRepository,
  openDatabase,
  OrderRepository,
  PaymentAttemptRepository,
  ProductRepository,
} from "@/server/db";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const statusPresentation: Record<
  CustomerOrderStatus,
  { label: string; tone: SemanticTone }
> = {
  PAYMENT_PENDING: { label: "Aguardando Pix", tone: "warning" },
  ARTWORK_RECEIVED: { label: "Arte em análise", tone: "info" },
  ARTWORK_CHANGES_REQUESTED: { label: "Correção necessária", tone: "warning" },
  ARTWORK_APPROVED: { label: "Arte aprovada", tone: "success" },
  IN_PRODUCTION: { label: "Em produção", tone: "info" },
  READY_FOR_PICKUP: { label: "Pronto para retirada", tone: "success" },
  SHIPPED: { label: "Enviado", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

export type CustomerOrdersDashboardData = {
  actions: CustomerActionItem[];
  activeOrders: CustomerOrderSummary[];
  completedOrders: CustomerOrderSummary[];
};

export type CustomerArtworkResubmissionData = {
  orderCode: string;
  productName: string;
  acceptedExtensions: string[];
  maximumFileSizeMb: number | null;
  correctionNote: string | null;
  correctionReferenceUrl: string | null;
  eligible: boolean;
};

export function getCustomerOrdersDashboard(
  customerEmail: string,
): CustomerOrdersDashboardData {
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const products = new ProductRepository(db);
    const customerOrders = orders.listForCustomerEmail(customerEmail);
    const productNames = new Map<string, string>();
    const summaries = customerOrders.map((order) => {
      if (!productNames.has(order.productId)) {
        productNames.set(
          order.productId,
          products.findById(order.productId)?.name ?? "Produto DTF",
        );
      }
      return mapOrderSummary(order, productNames.get(order.productId)!, orders.items(order.id));
    });

    return {
      actions: customerOrders.flatMap(mapCustomerAction),
      activeOrders: summaries.filter(
        (summary) =>
          summary.statusLabel !== statusPresentation.COMPLETED.label &&
          summary.statusLabel !== statusPresentation.CANCELLED.label,
      ),
      completedOrders: summaries.filter(
        (summary) =>
          summary.statusLabel === statusPresentation.COMPLETED.label ||
          summary.statusLabel === statusPresentation.CANCELLED.label,
      ),
    };
  } finally {
    db.close();
  }
}

export function getCustomerOrderDetail(
  code: string,
  customerEmail: string,
): CustomerOrderDetailData | null {
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const order = orders.findByCodeForCustomerEmail(code, customerEmail);
    if (!order) return null;

    const products = new ProductRepository(db);
    const product = products.findById(order.productId);
    const configuredPolicy = products.getDtfAggregate(order.productId)
      ?.productionPolicy;
    const productionPolicy = {
      standardStartWithinBusinessHours:
        configuredPolicy &&
        Number.isInteger(configuredPolicy.standardStartWithinBusinessHours) &&
        configuredPolicy.standardStartWithinBusinessHours > 0
          ? configuredPolicy.standardStartWithinBusinessHours
          : 24,
      customLeadTimeAboveMeters:
        configuredPolicy &&
        Number.isInteger(configuredPolicy.customLeadTimeAboveMeters) &&
        configuredPolicy.customLeadTimeAboveMeters > 0
          ? configuredPolicy.customLeadTimeAboveMeters
          : 100,
    };
    const events = orders.events(order.id);
    const files = new ArtworkVersionRepository(db).listForOrder(order.id);
    const payments = new PaymentAttemptRepository(db).listForOrder(order.id);
    const documents = new FiscalDocumentRepository(db).currentForOrder(order.id);
    const customerData = orders.getCustomerData(order.id);
    const status = deriveCustomerOrderStatus(order);
    const presentation = statusPresentation[status];
    const latestPayment = payments[0];
    const items = orders.items(order.id);
    const firstItem = items[0];
    const productName = items.length > 1
      ? `${firstItem?.productName ?? "Produto"} + ${items.length - 1} item(ns)`
      : firstItem?.productName ?? product?.name ?? "Produto";

    return {
      id: order.id,
      code: order.code,
      productName,
      quantityLabel: items.length === 1 && firstItem
        ? itemQuantityLabel(firstItem)
        : `${items.length} itens`,
      unitPriceLabel: formatMoney(firstItem?.unitPriceCents ?? order.priceSnapshot.unitPriceCents),
      subtotalLabel: formatMoney(order.subtotalCents),
      totalLabel: formatMoney(order.totalCents),
      statusLabel: presentation.label,
      statusTone: presentation.tone,
      placedAtLabel: formatDate(order.createdAt),
      action: mapDetailAction(order, status),
      timeline: buildTimeline(order, events, productionPolicy),
      files: files.map((file, index) => ({
        id: file.id,
        name: file.originalFilename,
        versionLabel: `Versão ${file.version}`,
        ...artworkStatusPresentation(file),
        submittedAtLabel: formatDateTime(file.createdAt),
        downloadHref:
          file.scanStatus === "CLEAN"
            ? `/api/orders/${encodeURIComponent(order.code)}/artwork/${encodeURIComponent(file.id)}/download`
            : undefined,
        replaceHref:
          index === 0 && order.artworkStatus === "CHANGES_REQUESTED"
            ? `/minha-conta/pedidos/${encodeURIComponent(order.code)}/arquivo`
            : undefined,
      })),
      payment: {
        methodLabel: order.paymentMethod === "PIX" ? "Pix" : "Cartão de crédito",
        statusLabel: paymentStatusLabel(order.paymentStatus),
        statusTone: paymentStatusTone(order.paymentStatus),
        paidAtLabel:
          latestPayment?.status === "PAID" || latestPayment?.status === "REFUNDED"
            ? formatDateTime(latestPayment.updatedAt)
            : undefined,
      },
      fulfillment: {
        methodLabel: order.fulfillmentMethod === "PICKUP" ? "Retirada local" : "Entrega",
        statusLabel: fulfillmentStatusLabel(order.fulfillmentStatus),
        addressOrPickupLabel: fulfillmentAddressLabel(order, customerData),
      },
      documents: documents.map((document) => ({
        id: document.id,
        title: document.type === "INVOICE" ? "Nota fiscal" : "Recibo",
        numberLabel:
          typeof document.metadata.number === "string"
            ? document.metadata.number
            : undefined,
        issuedAtLabel: formatDate(document.createdAt),
        downloadHref: `/api/orders/${encodeURIComponent(order.code)}/documents/${encodeURIComponent(document.id)}/download`,
      })),
      supportHref: `/contato?pedido=${encodeURIComponent(order.code)}`,
      reorderHref: product?.type === "STANDARD_PRODUCT"
        ? product.slug
        : `/dtf/pedido?produto=${encodeURIComponent(order.productId)}&meters=${order.quantityMeters}`,
    };
  } finally {
    db.close();
  }
}

export function getCustomerArtworkResubmission(
  code: string,
  customerEmail: string,
): CustomerArtworkResubmissionData | null {
  const db = openDatabase();
  try {
    const orders = new OrderRepository(db);
    const order = orders.findByCodeForCustomerEmail(code, customerEmail);
    if (!order) return null;

    const products = new ProductRepository(db);
    const product = products.findById(order.productId);
    const aggregate = products.getDtfAggregate(order.productId);
    const latestArtwork = new ArtworkVersionRepository(db).listForOrder(order.id)[0];

    return {
      orderCode: order.code,
      productName: product?.name ?? "Produto DTF",
      acceptedExtensions: aggregate?.filePolicy?.confirmed
        ? aggregate.filePolicy.acceptedExtensions
        : ["PNG", "PDF", "TIFF"],
      maximumFileSizeMb: aggregate?.filePolicy?.confirmed
        ? aggregate.filePolicy.maximumFileSizeMb
        : 10,
      correctionNote: latestArtwork?.reviewNote ?? null,
      correctionReferenceUrl:
        typeof latestArtwork?.metadata.correctionReferenceUrl === "string"
          ? latestArtwork.metadata.correctionReferenceUrl
          : null,
      eligible: order.artworkStatus === "CHANGES_REQUESTED",
    };
  } finally {
    db.close();
  }
}

function itemQuantityLabel(item: OrderItem) {
  if (item.unit === "METER") {
    return `${item.quantity} ${item.quantity === 1 ? "metro" : "metros"}`;
  }
  return `${item.quantity} ${item.quantity === 1 ? "unidade" : "unidades"}`;
}

function mapOrderSummary(
  order: Order,
  fallbackProductName: string,
  items: OrderItem[],
): CustomerOrderSummary {
  const status = deriveCustomerOrderStatus(order);
  const presentation = statusPresentation[status];
  const firstItem = items[0];
  return {
    id: order.id,
    code: order.code,
    productName: items.length > 1
      ? `${firstItem?.productName ?? fallbackProductName} + ${items.length - 1} item(ns)`
      : firstItem?.productName ?? fallbackProductName,
    quantityLabel: items.length === 1 && firstItem
      ? itemQuantityLabel(firstItem)
      : `${items.length} itens`,
    totalLabel: formatMoney(order.totalCents),
    statusLabel: presentation.label,
    statusTone: presentation.tone,
    updatedAtLabel: formatDateTime(order.updatedAt),
    href: `/minha-conta/pedidos/${encodeURIComponent(order.code)}`,
  };
}

function mapCustomerAction(order: Order): CustomerActionItem[] {
  const status = deriveCustomerOrderStatus(order);
  const href = `/minha-conta/pedidos/${encodeURIComponent(order.code)}`;

  if (status === "ARTWORK_CHANGES_REQUESTED") {
    return [
      {
        id: `artwork-${order.id}`,
        orderCode: order.code,
        title: "Seu arquivo precisa de ajuste",
        description:
          "Veja a orientação da produção e envie uma nova versão para o pedido continuar.",
        actionLabel: "Ver correção",
        href: `${href}/arquivo`,
      },
    ];
  }
  if (status === "PAYMENT_PENDING") {
    return [
      {
        id: `payment-${order.id}`,
        orderCode: order.code,
        title: "Pagamento Pix pendente",
        description: "Consulte o estado do Pix antes de gerar uma nova cobrança.",
        actionLabel: "Ver pagamento",
        href: `/dtf/pedido/confirmar?pedido=${encodeURIComponent(order.code)}`,
      },
    ];
  }
  return [];
}

function mapDetailAction(
  order: Order,
  status: CustomerOrderStatus,
): CustomerOrderDetailData["action"] {
  if (status === "ARTWORK_CHANGES_REQUESTED") {
    return {
      title: "A produção solicitou uma correção",
      description:
        "Consulte a versão mais recente e a orientação registrada antes de substituir o arquivo.",
      actionLabel: "Enviar nova versão",
      href: `/minha-conta/pedidos/${encodeURIComponent(order.code)}/arquivo`,
      secondaryLabel: "Falar com atendimento",
      secondaryHref: `/contato?pedido=${encodeURIComponent(order.code)}`,
    };
  }
  if (status === "PAYMENT_PENDING") {
    return {
      title: "Pagamento Pix ainda não confirmado",
      description:
        "A produção continuará bloqueada até a confirmação segura do pagamento.",
      actionLabel: "Ver pagamento",
      href: `/dtf/pedido/confirmar?pedido=${encodeURIComponent(order.code)}`,
    };
  }
  return undefined;
}

function artworkStatusPresentation(file: ArtworkVersion): {
  statusLabel: string;
  statusTone: SemanticTone;
} {
  if (file.reviewStatus === "APPROVED") {
    return { statusLabel: "Aprovado", statusTone: "success" };
  }
  if (file.reviewStatus === "CHANGES_REQUESTED") {
    return { statusLabel: "Correção solicitada", statusTone: "warning" };
  }
  if (
    file.reviewStatus === "REJECTED" ||
    file.scanStatus === "REJECTED" ||
    file.preflightStatus === "BLOCKED"
  ) {
    return { statusLabel: "Arquivo bloqueado", statusTone: "danger" };
  }
  if (file.scanStatus === "CLEAN" && file.preflightStatus === "WARNING") {
    return { statusLabel: "Em revisão", statusTone: "warning" };
  }
  if (file.scanStatus === "CLEAN") {
    return { statusLabel: "Em revisão", statusTone: "info" };
  }
  return { statusLabel: "Em verificação", statusTone: "neutral" };
}

function buildTimeline(
  order: Order,
  events: OrderEvent[],
  productionPolicy: {
    standardStartWithinBusinessHours: number;
    customLeadTimeAboveMeters: number;
  },
): OrderTimelineEvent[] {
  const paymentPaidAt = findEventDate(events, "paymentStatus", "PAID");
  const artworkApprovedAt = findEventDate(events, "artworkStatus", "APPROVED");
  const productionAt = findEventDate(events, "productionStatus", "IN_PRODUCTION");
  const fulfilledAt =
    findEventDate(events, "fulfillmentStatus", "PICKED_UP") ??
    findEventDate(events, "fulfillmentStatus", "DELIVERED");

  const paymentComplete = ["PAID", "REFUNDED"].includes(order.paymentStatus);
  const artworkIssue = ["CHANGES_REQUESTED", "AUTO_REJECTED"].includes(
    order.artworkStatus,
  );
  const artworkComplete = order.artworkStatus === "APPROVED";
  const productionStarted = ["IN_PRODUCTION", "READY", "COMPLETED"].includes(
    order.productionStatus,
  );
  const fulfillmentComplete = ["PICKED_UP", "DELIVERED"].includes(
    order.fulfillmentStatus,
  );
  const fulfillmentCurrent = ["READY_FOR_PICKUP", "SHIPPED"].includes(
    order.fulfillmentStatus,
  );

  return [
    {
      id: "received",
      title: "Pedido recebido",
      description: "Quantidade e preço ficaram registrados no pedido.",
      occurredAtLabel: formatDateTime(order.createdAt),
      state: "complete",
    },
    {
      id: "payment",
      title: paymentComplete ? "Pagamento confirmado" : "Confirmação do Pix",
      description: paymentComplete
        ? "O Pix foi conciliado com segurança."
        : "Aguardando a confirmação do provedor de pagamento.",
      occurredAtLabel: paymentPaidAt ? formatDateTime(paymentPaidAt) : undefined,
      state: paymentComplete ? "complete" : "current",
    },
    {
      id: "artwork",
      title: artworkIssue
        ? "Correção da personalização necessária"
        : artworkComplete
          ? "Personalização aprovada"
          : "Revisão da personalização",
      description: artworkIssue
        ? "Uma nova versão precisa ser enviada."
        : artworkComplete
          ? "A equipe aprovou os dados e arquivos enviados."
          : "A equipe verificará os dados e arquivos antes de produzir.",
      occurredAtLabel: artworkApprovedAt
        ? formatDateTime(artworkApprovedAt)
        : undefined,
      state: artworkIssue
        ? "issue"
        : artworkComplete
          ? "complete"
          : paymentComplete
            ? "current"
            : "pending",
    },
    {
      id: "production",
      title: order.productionStatus === "COMPLETED" ? "Produção concluída" : "Produção",
      description:
        order.quantityMeters > productionPolicy.customLeadTimeAboveMeters
          ? order.manualLeadTimeNote?.trim() ||
            `O prazo será confirmado conforme a fila para pedidos acima de ${productionPolicy.customLeadTimeAboveMeters} metros.`
          : `Início em até ${productionPolicy.standardStartWithinBusinessHours} ${productionPolicy.standardStartWithinBusinessHours === 1 ? "hora útil" : "horas úteis"} após Pix e arte aprovados.`,
      occurredAtLabel: productionAt ? formatDateTime(productionAt) : undefined,
      state: order.productionStatus === "COMPLETED"
        ? "complete"
        : productionStarted
          ? "current"
          : "pending",
    },
    {
      id: "fulfillment",
      title: order.fulfillmentMethod === "PICKUP" ? "Retirada" : "Entrega",
      description:
        order.fulfillmentMethod === "PICKUP"
          ? order.fulfillmentStatus === "READY_FOR_PICKUP"
            ? "Seu pedido está pronto. Consulte o local de retirada antes de se deslocar."
            : order.fulfillmentStatus === "PICKED_UP"
              ? "Retirada confirmada pela equipe."
              : "Aguarde a confirmação antes de se deslocar."
          : "O rastreamento aparecerá quando o pedido for enviado.",
      occurredAtLabel: fulfilledAt ? formatDateTime(fulfilledAt) : undefined,
      state: fulfillmentComplete
        ? "complete"
        : fulfillmentCurrent
          ? "current"
          : "pending",
    },
  ];
}

function findEventDate(
  events: OrderEvent[],
  key: string,
  value: string,
): string | null {
  return (
    [...events]
      .reverse()
      .find((event) => event.metadata[key] === value)?.createdAt ?? null
  );
}

function fulfillmentAddressLabel(
  order: Order,
  customerData: ReturnType<OrderRepository["getCustomerData"]>,
): string {
  if (order.fulfillmentMethod === "PICKUP") {
    return customerData?.fulfillment.pickupLocationId
      ? `Local de retirada: ${customerData.fulfillment.pickupLocationId}`
      : "Retirada na Leal Brinde. O endereço será confirmado no atendimento.";
  }
  const address = customerData?.fulfillment.shippingAddress;
  if (!address) return "Endereço de entrega ainda não informado.";
  return `${address.street}, ${address.number}, ${address.district}, ${address.city}/${address.state}`;
}

function paymentStatusLabel(status: Order["paymentStatus"]): string {
  return {
    DRAFT: "Não gerado",
    PENDING_PIX: "Aguardando Pix",
    PAID: "Pago",
    EXPIRED: "Expirado",
    FAILED: "Falhou",
    REFUNDED: "Reembolsado",
  }[status];
}

function paymentStatusTone(status: Order["paymentStatus"]): SemanticTone {
  if (status === "PAID") return "success";
  if (["FAILED", "EXPIRED"].includes(status)) return "danger";
  if (status === "REFUNDED") return "neutral";
  return "warning";
}

function fulfillmentStatusLabel(status: Order["fulfillmentStatus"]): string {
  return {
    PENDING: "Aguardando produção",
    READY_FOR_PICKUP: "Pronto para retirada",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    PICKED_UP: "Retirado",
  }[status];
}

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
