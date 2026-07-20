import type Database from "better-sqlite3";

import {
  assertProductionInvariant,
  shouldRequireManualLeadTime,
  type ArtworkStatus,
  type FulfillmentOption,
  type FulfillmentStatus,
  type Order,
  type OrderCustomerData,
  type OrderEvent,
  type OrderItem,
  type PaymentStatus,
  type PriceSnapshot,
  type ProductionStatus,
} from "@/domain";

import { mapOrder, mapOrderCustomerData, mapOrderEvent, mapOrderItem } from "./mappers";
import { ProductRepository } from "./product-repository";
import { asRow, asRows, domainId, nowIso, writeAudit } from "./repository-helpers";

export type CreateOrderInput = {
  code: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  quantityMeters: number;
  fulfillmentMethod: FulfillmentOption;
};

export type OrderStatusPatch = {
  paymentStatus?: PaymentStatus;
  artworkStatus?: ArtworkStatus;
  productionStatus?: ProductionStatus;
  fulfillmentStatus?: FulfillmentStatus;
  manualLeadTimeNote?: string | null;
};

export type SaveOrderCustomerDataInput = Omit<
  OrderCustomerData,
  "orderId" | "createdAt" | "updatedAt"
>;

export class OrderRepository {
  private readonly products: ProductRepository;

  constructor(private readonly db: Database.Database) {
    this.products = new ProductRepository(db);
  }

  list(): Order[] {
    return asRows(
      this.db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all(),
    ).map(mapOrder);
  }

  listForCustomerEmail(customerEmail: string): Order[] {
    return asRows(
      this.db
        .prepare(
          `SELECT * FROM orders
           WHERE LOWER(customer_email) = LOWER(?)
           ORDER BY created_at DESC`,
        )
        .all(customerEmail.trim()),
    ).map(mapOrder);
  }

  findById(orderId: string): Order | null {
    const row = asRow(this.db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));
    return row ? mapOrder(row) : null;
  }

  findByCode(code: string): Order | null {
    const row = asRow(this.db.prepare("SELECT * FROM orders WHERE code = ?").get(code));
    return row ? mapOrder(row) : null;
  }

  findByCodeForCustomerEmail(
    code: string,
    customerEmail: string,
  ): Order | null {
    const row = asRow(
      this.db
        .prepare(
          `SELECT * FROM orders
           WHERE code = ? AND LOWER(customer_email) = LOWER(?)`,
        )
        .get(code, customerEmail.trim()),
    );
    return row ? mapOrder(row) : null;
  }

  create(input: CreateOrderInput, actorId = "customer"): Order {
    const product = this.products.findById(input.productId);
    if (!product || product.status === "ARCHIVED") {
      throw new Error("Produto indisponível para novos pedidos.");
    }
    if (!product.fulfillmentOptions.includes(input.fulfillmentMethod)) {
      throw new Error("Forma de atendimento indisponível para este produto.");
    }

    const quote = this.products.calculatePrice(input.productId, input.quantityMeters);
    const priceSnapshot: PriceSnapshot = {
      priceTableId: quote.priceTableId,
      priceTableVersion: quote.priceTableVersion,
      priceTierId: quote.tier.id,
      minimumMeters: quote.tier.minimumMeters,
      maximumExclusiveMeters: quote.tier.maximumExclusiveMeters,
      quantityMeters: quote.quantityMeters,
      unitPriceCents: quote.unitPriceCents,
      subtotalCents: quote.subtotalCents,
      currency: "BRL",
    };
    const id = domainId("order");
    const timestamp = nowIso();

    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO orders (
            id, code, product_id, customer_name, customer_email,
            quantity_meters, price_snapshot_json, payment_status,
            artwork_status, production_status, fulfillment_status,
            fulfillment_method, production_ready_at, manual_lead_time_note,
            created_at, updated_at, payment_method, subtotal_cents,
            shipping_cents, total_cents
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'UPLOADING', 'BLOCKED',
                    'PENDING', ?, NULL, NULL, ?, ?, 'PIX', ?, 0, ?)`,
        )
        .run(
          id,
          input.code,
          input.productId,
          input.customerName,
          input.customerEmail,
          input.quantityMeters,
          JSON.stringify(priceSnapshot),
          input.fulfillmentMethod,
          timestamp,
          timestamp,
          priceSnapshot.subtotalCents,
          priceSnapshot.subtotalCents,
        );
      this.db.prepare(
        `INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_type, product_name,
          sku, quantity, unit, unit_price_cents, total_cents,
          price_snapshot_json, customization_snapshot_json, shipping_snapshot_json,
          artwork_status, production_status, production_ready_at,
          manual_lead_time_note, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'METER', ?, ?, ?, '{}', '{}',
                  'UPLOADING', 'BLOCKED', NULL, NULL, ?, ?)`,
      ).run(
        domainId("order_item"),
        id,
        product.id,
        product.type,
        product.name,
        product.code,
        input.quantityMeters,
        priceSnapshot.unitPriceCents,
        priceSnapshot.subtotalCents,
        JSON.stringify(priceSnapshot),
        timestamp,
        timestamp,
      );
      this.insertEvent({
        orderId: id,
        type: "ORDER_CREATED",
        description: "Pedido criado com preço preservado.",
        metadata: { quantityMeters: input.quantityMeters },
        createdAt: timestamp,
      });
      writeAudit(this.db, {
        actorId,
        action: "ORDER_CREATED",
        entityType: "Order",
        entityId: id,
        after: { code: input.code, productId: input.productId },
      });
    })();

    return this.requireOrder(id);
  }

  updateStatuses(
    orderId: string,
    patch: OrderStatusPatch,
    actorId: string,
  ): Order {
    const current = this.requireOrder(orderId);
    const next: Order = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    assertProductionInvariant(
      next.paymentStatus,
      next.artworkStatus,
      next.productionStatus,
    );

    const configuredThreshold = this.products.getDtfAggregate(
      next.productId,
    )?.productionPolicy?.customLeadTimeAboveMeters;
    const customLeadTimeAboveMeters =
      typeof configuredThreshold === "number" &&
      Number.isInteger(configuredThreshold) &&
      configuredThreshold > 0
        ? configuredThreshold
        : 100;

    if (
      shouldRequireManualLeadTime(
        next.quantityMeters,
        customLeadTimeAboveMeters,
      ) &&
      ["QUEUED", "IN_PRODUCTION", "READY", "COMPLETED"].includes(
        next.productionStatus,
      ) &&
      !next.manualLeadTimeNote?.trim()
    ) {
      throw new Error(
        `Pedidos acima de ${customLeadTimeAboveMeters} metros precisam de um prazo manual antes da produção.`,
      );
    }

    const productionReadyAt =
      next.productionStatus !== "BLOCKED" && current.productionStatus === "BLOCKED"
        ? next.updatedAt
        : current.productionReadyAt;

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE orders SET
            payment_status = ?, artwork_status = ?, production_status = ?,
            fulfillment_status = ?, production_ready_at = ?,
            manual_lead_time_note = ?, updated_at = ?
          WHERE id = ?`,
        )
        .run(
          next.paymentStatus,
          next.artworkStatus,
          next.productionStatus,
          next.fulfillmentStatus,
          productionReadyAt,
          next.manualLeadTimeNote,
          next.updatedAt,
          orderId,
        );
      this.insertEvent({
        orderId,
        type: "ORDER_STATUS_CHANGED",
        description: "Situação do pedido atualizada.",
        metadata: {
          paymentStatus: next.paymentStatus,
          artworkStatus: next.artworkStatus,
          productionStatus: next.productionStatus,
          fulfillmentStatus: next.fulfillmentStatus,
        },
        createdAt: next.updatedAt,
      });
      writeAudit(this.db, {
        actorId,
        action: "ORDER_STATUS_CHANGED",
        entityType: "Order",
        entityId: orderId,
        before: {
          paymentStatus: current.paymentStatus,
          artworkStatus: current.artworkStatus,
          productionStatus: current.productionStatus,
          fulfillmentStatus: current.fulfillmentStatus,
        },
        after: {
          paymentStatus: next.paymentStatus,
          artworkStatus: next.artworkStatus,
          productionStatus: next.productionStatus,
          fulfillmentStatus: next.fulfillmentStatus,
        },
      });
    })();

    return this.requireOrder(orderId);
  }

  events(orderId: string): OrderEvent[] {
    return asRows(
      this.db
        .prepare(
          "SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC",
        )
        .all(orderId),
    ).map(mapOrderEvent);
  }

  items(orderId: string): OrderItem[] {
    return asRows(
      this.db.prepare(
        "SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at, id",
      ).all(orderId),
    ).map(mapOrderItem);
  }

  approveStructuredPersonalizations(orderId: string, actorId: string): Order {
    const order = this.requireOrder(orderId);
    if (order.paymentStatus !== "PAID") {
      throw new Error("A personalização só pode ser aprovada depois do pagamento.");
    }

    const timestamp = nowIso();
    this.db.transaction(() => {
      const result = this.db.prepare(
        `UPDATE order_items
         SET artwork_status = 'APPROVED', production_status = 'QUEUED',
             production_ready_at = COALESCE(production_ready_at, ?), updated_at = ?
         WHERE order_id = ? AND artwork_status = 'PENDING_REVIEW'
           AND EXISTS (
             SELECT 1 FROM standard_product_configurations configuration
             WHERE configuration.product_id = order_items.product_id
               AND configuration.personalization_mode = 'STRUCTURED_FIELDS'
           )
           AND NOT EXISTS (
             SELECT 1 FROM artwork_versions
             WHERE artwork_versions.order_item_id = order_items.id
           )`,
      ).run(timestamp, timestamp, orderId);
      if (result.changes === 0) {
        throw new Error("Não há personalização estruturada aguardando aprovação.");
      }

      const remainingBlocked = this.db.prepare(
        "SELECT 1 FROM order_items WHERE order_id = ? AND production_status = 'BLOCKED' LIMIT 1",
      ).get(orderId);
      const remainingArtwork = this.db.prepare(
        `SELECT 1 FROM order_items
         WHERE order_id = ? AND artwork_status NOT IN ('APPROVED', 'NOT_REQUIRED')
         LIMIT 1`,
      ).get(orderId);
      this.updateStatuses(
        orderId,
        {
          artworkStatus: remainingArtwork ? "PENDING_REVIEW" : "APPROVED",
          productionStatus: remainingBlocked ? "BLOCKED" : "QUEUED",
        },
        actorId,
      );
      writeAudit(this.db, {
        actorId,
        action: "STRUCTURED_PERSONALIZATION_APPROVED",
        entityType: "Order",
        entityId: orderId,
        after: { approvedItems: result.changes },
      });
    })();

    return this.requireOrder(orderId);
  }

  transitionItemProduction(
    orderId: string,
    from: OrderItem["productionStatus"],
    to: OrderItem["productionStatus"],
    actorId: string,
  ): number {
    const timestamp = nowIso();
    const result = this.db.prepare(
      `UPDATE order_items
       SET production_status = ?,
           production_ready_at = CASE
             WHEN production_status = 'BLOCKED' THEN COALESCE(production_ready_at, ?)
             ELSE production_ready_at
           END,
           updated_at = ?
       WHERE order_id = ? AND production_status = ?`,
    ).run(to, timestamp, timestamp, orderId, from);
    if (result.changes === 0) {
      throw new Error("Nenhum item está disponível para esta etapa de produção.");
    }
    writeAudit(this.db, {
      actorId,
      action: "ORDER_ITEMS_PRODUCTION_CHANGED",
      entityType: "Order",
      entityId: orderId,
      before: { productionStatus: from },
      after: { productionStatus: to, itemCount: result.changes },
    });
    return result.changes;
  }

  releaseApprovedItems(orderId: string, actorId: string): number {
    const timestamp = nowIso();
    const result = this.db.prepare(
      `UPDATE order_items
       SET production_status = 'QUEUED',
           production_ready_at = COALESCE(production_ready_at, ?), updated_at = ?
       WHERE order_id = ? AND production_status = 'BLOCKED'
         AND artwork_status IN ('APPROVED', 'NOT_REQUIRED')`,
    ).run(timestamp, timestamp, orderId);
    if (result.changes > 0) {
      writeAudit(this.db, {
        actorId,
        action: "ORDER_ITEMS_RELEASED_TO_PRODUCTION",
        entityType: "Order",
        entityId: orderId,
        after: { itemCount: result.changes },
      });
    }
    return result.changes;
  }

  saveCustomerData(
    orderId: string,
    input: SaveOrderCustomerDataInput,
    actorId = "customer",
  ): OrderCustomerData {
    const order = this.requireOrder(orderId);
    if (input.fulfillment.method !== order.fulfillmentMethod) {
      throw new Error("A forma de atendimento não corresponde ao pedido.");
    }
    if (
      input.fulfillment.method === "SHIPPING" &&
      !input.fulfillment.shippingAddress
    ) {
      throw new Error("Informe o endereço completo para entrega.");
    }
    if (!input.contact.name.trim() || !input.contact.email.trim()) {
      throw new Error("Nome e e-mail de contato são obrigatórios.");
    }

    const fiscal = normalizeFiscalSnapshot(input.fiscal);
    const current = this.getCustomerData(orderId);
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO order_customer_data (
            order_id, contact_json, fulfillment_json, fiscal_json,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(order_id) DO UPDATE SET
            contact_json = excluded.contact_json,
            fulfillment_json = excluded.fulfillment_json,
            fiscal_json = excluded.fiscal_json,
            updated_at = excluded.updated_at`,
        )
        .run(
          orderId,
          JSON.stringify(input.contact),
          JSON.stringify(input.fulfillment),
          JSON.stringify(fiscal),
          current?.createdAt ?? timestamp,
          timestamp,
        );
      this.db
        .prepare(
          `UPDATE orders
           SET customer_name = ?, customer_email = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(input.contact.name, input.contact.email, timestamp, orderId);
      writeAudit(this.db, {
        actorId,
        action: "ORDER_CUSTOMER_DATA_SAVED",
        entityType: "Order",
        entityId: orderId,
        before: current
          ? {
              fulfillmentMethod: current.fulfillment.method,
              fiscalRequested: current.fiscal.requested,
            }
          : null,
        after: {
          fulfillmentMethod: input.fulfillment.method,
          fiscalRequested: fiscal.requested,
          fiscalPartyType: fiscal.partyType,
        },
      });
    })();
    return this.requireCustomerData(orderId);
  }

  getCustomerData(orderId: string): OrderCustomerData | null {
    const row = asRow(
      this.db
        .prepare("SELECT * FROM order_customer_data WHERE order_id = ?")
        .get(orderId),
    );
    return row ? mapOrderCustomerData(row) : null;
  }

  private insertEvent(input: Omit<OrderEvent, "id">): void {
    this.db
      .prepare(
        `INSERT INTO order_events (
          id, order_id, type, description, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        domainId("order_event"),
        input.orderId,
        input.type,
        input.description,
        JSON.stringify(input.metadata),
        input.createdAt,
      );
  }

  private requireOrder(orderId: string): Order {
    const order = this.findById(orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    return order;
  }

  private requireCustomerData(orderId: string): OrderCustomerData {
    const data = this.getCustomerData(orderId);
    if (!data) throw new Error("Dados do cliente não encontrados para o pedido.");
    return data;
  }
}

function normalizeFiscalSnapshot(
  fiscal: SaveOrderCustomerDataInput["fiscal"],
): SaveOrderCustomerDataInput["fiscal"] {
  if (!fiscal.requested) {
    return {
      requested: false,
      partyType: null,
      document: null,
      legalName: null,
      tradeName: null,
      stateRegistration: null,
      municipalRegistration: null,
      email: null,
      phone: null,
      address: null,
    };
  }
  if (!fiscal.partyType || !fiscal.document || !fiscal.legalName?.trim()) {
    throw new Error("Tipo, documento e nome fiscal são obrigatórios.");
  }

  const document = fiscal.document.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (fiscal.partyType === "PF" && !/^\d{11}$/.test(document)) {
    throw new Error("O CPF informado é inválido.");
  }
  if (fiscal.partyType === "PJ" && !/^[A-Z0-9]{14}$/.test(document)) {
    throw new Error("O CNPJ informado é inválido.");
  }

  return { ...fiscal, document };
}
