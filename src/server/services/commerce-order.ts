import "server-only";

import { randomBytes } from "node:crypto";

import { allowedPaymentMethods, type Cart, type CartLine, type PaymentMethod } from "@/domain";
import { CommerceRepository, openDatabase, PaymentAttemptRepository } from "@/server/db";
import { domainId, nowIso, writeAudit } from "@/server/db/repository-helpers";
import { getCommercePaymentGateway, type CommercePaymentResult } from "@/server/integrations/payment-gateway";
import { getStoredArtwork, markStoredArtworkClaimed } from "@/server/integrations/object-storage";

type CheckoutAddress = {
  postalCode: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
};

type CreateCommerceOrderInput = {
  cart: Cart;
  lines: CartLine[];
  customer: { id: string; name: string; email: string; phone: string; document: string };
  paymentMethod: PaymentMethod;
  installments: number;
  cardToken?: string;
  cardPaymentMethodId?: string;
  fulfillment: { method: "PICKUP" | "SHIPPING"; address: CheckoutAddress | null; shippingQuoteId: string | null };
  fiscal: { requested: boolean; partyType: "PF" | "PJ" | null; document: string | null; legalName: string | null };
};

function createCode() {
  return `LB-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createCommerceOrder(input: CreateCommerceOrderInput): Promise<{
  orderId: string;
  orderCode: string;
  payment: CommercePaymentResult;
}> {
  if (!input.lines.length) throw new Error("O carrinho está vazio.");
  const storedArtworks = new Map<string, Awaited<ReturnType<typeof getStoredArtwork>>>();
  for (const line of input.lines) {
    if (line.product.type === "DTF_BY_METER" && !line.artworkAssetId) {
      throw new Error(`Envie a arte de ${line.product.name} antes de finalizar.`);
    }
    if (line.artworkAssetId) {
      try {
        storedArtworks.set(line.id, await getStoredArtwork(line.artworkAssetId));
      } catch {
        throw new Error(`O arquivo de ${line.product.name} expirou. Envie-o novamente.`);
      }
    }
  }
  const db = openDatabase();
  let orderId = "";
  let orderCode = "";
  let totalCents = 0;
  let shippingCents = 0;
  try {
    const commerce = new CommerceRepository(db);
    const settings = commerce.getSettings();
    if (!settings.directCheckoutEnabled) throw new Error("A compra direta ainda não foi liberada.");
    const permitted = allowedPaymentMethods(input.lines.map((line) => line.product.type), settings.cardEnabled);
    if (!permitted.includes(input.paymentMethod)) throw new Error("Forma de pagamento indisponível para este carrinho.");
    if (input.paymentMethod === "CREDIT_CARD" && (!input.cardToken || !input.cardPaymentMethodId || input.installments < 1 || input.installments > settings.maxInstallments)) {
      throw new Error("Token do cartão ou parcelamento inválido.");
    }
    let quoteSnapshot: Record<string, unknown> = {};
    if (input.fulfillment.method === "SHIPPING") {
      if (!settings.shippingEnabled || !input.fulfillment.address || !input.fulfillment.shippingQuoteId) throw new Error("Selecione um frete válido.");
      const quote = db.prepare(
        `SELECT * FROM shipping_quotes WHERE id = ? AND cart_id = ? AND expires_at > ?`,
      ).get(input.fulfillment.shippingQuoteId, input.cart.id, nowIso()) as Record<string, unknown> | undefined;
      if (!quote) throw new Error("A cotação expirou. Calcule o frete novamente.");
      shippingCents = Number(quote.amount_cents);
      quoteSnapshot = { provider: quote.provider, serviceCode: quote.service_code, label: quote.service_label, amountCents: shippingCents, estimatedBusinessDays: JSON.parse(String(quote.payload_json)).estimatedBusinessDays };
    }
    const subtotalCents = input.lines.reduce((sum, line) => sum + line.totalCents, 0);
    totalCents = subtotalCents + shippingCents;
    orderId = domainId("order");
    orderCode = createCode();
    const timestamp = nowIso();
    const needsReview = input.lines.some((line) => {
      if (line.product.type === "DTF_BY_METER") return true;
      const config = db.prepare("SELECT personalization_mode, review_required FROM standard_product_configurations WHERE product_id = ?").get(line.productId) as { personalization_mode?: string; review_required?: number } | undefined;
      return config?.personalization_mode === "ARTWORK_UPLOAD" || config?.review_required === 1;
    });
    const legacySnapshot = {
      priceTableId: "commerce-cart",
      priceTableVersion: 1,
      priceTierId: "mixed-cart",
      minimumMeters: 1,
      maximumExclusiveMeters: null,
      quantityMeters: input.lines[0].quantity,
      unitPriceCents: input.lines[0].unitPriceCents,
      subtotalCents: totalCents,
      currency: "BRL",
    } as const;

    db.transaction(() => {
      db.prepare(
        `INSERT INTO orders (
          id, code, product_id, customer_name, customer_email, quantity_meters,
          price_snapshot_json, payment_status, artwork_status, production_status,
          fulfillment_status, fulfillment_method, production_ready_at,
          manual_lead_time_note, created_at, updated_at, customer_id,
          payment_method, subtotal_cents, shipping_cents, total_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, 'BLOCKED', 'PENDING', ?,
                  NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(orderId, orderCode, input.lines[0].productId, input.customer.name,
        input.customer.email, input.lines[0].quantity, JSON.stringify(legacySnapshot),
        needsReview ? "PENDING_REVIEW" : "APPROVED", input.fulfillment.method,
        timestamp, timestamp, input.customer.id, input.paymentMethod,
        subtotalCents, shippingCents, totalCents);

      let artworkVersion = 0;
      input.lines.forEach((line) => {
        const config = line.product.type === "STANDARD_PRODUCT" ? db.prepare(
          "SELECT personalization_mode, review_required FROM standard_product_configurations WHERE product_id = ?",
        ).get(line.productId) as { personalization_mode?: string; review_required?: number } | undefined : null;
        const artworkStatus = line.product.type === "DTF_BY_METER" || config?.personalization_mode === "ARTWORK_UPLOAD" || config?.review_required === 1
          ? "PENDING_REVIEW" : "NOT_REQUIRED";
        const orderItemId = domainId("order_item");
        db.prepare(
          `INSERT INTO order_items (
            id, order_id, product_id, variant_id, product_type, product_name,
            sku, quantity, unit, unit_price_cents, total_cents, price_snapshot_json,
            customization_snapshot_json, shipping_snapshot_json, artwork_status,
            production_status, production_ready_at, manual_lead_time_note,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BLOCKED', NULL, NULL, ?, ?)`,
        ).run(orderItemId, orderId, line.productId, line.variantId,
          line.product.type, line.product.name, line.variant?.sku ?? line.product.code,
          line.quantity, line.unit, line.unitPriceCents, line.totalCents,
          JSON.stringify({ variantId: line.variantId, unitPriceCents: line.unitPriceCents, personalizationCents: line.personalizationCents, totalCents: line.totalCents, currency: "BRL" }),
          JSON.stringify(line.customization), JSON.stringify(quoteSnapshot), artworkStatus,
          timestamp, timestamp);
        const storedArtwork = storedArtworks.get(line.id);
        if (storedArtwork) {
          artworkVersion += 1;
          db.prepare(
            `INSERT INTO artwork_versions (
              id, order_id, version, storage_key, original_filename, mime_type,
              size_bytes, checksum_sha256, scan_status, preflight_status,
              review_status, review_note, reviewed_by, reviewed_at, uploaded_by,
              metadata_json, created_at, order_item_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'WARNING', 'PENDING',
                      NULL, NULL, NULL, ?, ?, ?, ?)`,
          ).run(
            domainId("artwork"), orderId, artworkVersion, storedArtwork.storageKey,
            storedArtwork.originalName, storedArtwork.mediaType, storedArtwork.sizeBytes,
            storedArtwork.checksumSha256, input.customer.id,
            JSON.stringify({ detectedType: storedArtwork.detectedType, validationMode: "homologation-signature-only", cartItemId: line.id }),
            timestamp, orderItemId,
          );
        }
        if (line.variant?.stockMode === "TRACKED") {
          const changed = db.prepare(
            `UPDATE product_variants SET reserved_quantity = reserved_quantity + ?, updated_at = ?
             WHERE id = ? AND available_quantity - reserved_quantity >= ?`,
          ).run(line.quantity, timestamp, line.variant.id, line.quantity);
          if (changed.changes !== 1) throw new Error(`O estoque de ${line.product.name} mudou. Revise o carrinho.`);
          db.prepare(
            `INSERT INTO inventory_movements (
              id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
            ) VALUES (?, ?, ?, 'RESERVATION', ?, 'Reserva para pagamento', ?, ?)`,
          ).run(domainId("inventory"), line.variant.id, orderId, line.quantity, input.customer.id, timestamp);
        }
      });
      db.prepare(
        `INSERT INTO order_customer_data (
          order_id, contact_json, fulfillment_json, fiscal_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(orderId, JSON.stringify({ name: input.customer.name, email: input.customer.email, phone: input.customer.phone }),
        JSON.stringify({ method: input.fulfillment.method, shippingAddress: input.fulfillment.address ? { postalCode: input.fulfillment.address.postalCode.replace(/\D/g, ""), street: input.fulfillment.address.street, number: input.fulfillment.address.number, complement: input.fulfillment.address.complement || null, district: input.fulfillment.address.neighborhood, city: input.fulfillment.address.city, state: input.fulfillment.address.state.toUpperCase(), country: "BR" } : null, pickupLocationId: input.fulfillment.method === "PICKUP" ? "leal-brinde-principal" : null }),
        JSON.stringify({ requested: input.fiscal.requested, partyType: input.fiscal.requested ? input.fiscal.partyType : null, document: input.fiscal.requested ? input.fiscal.document?.replace(/[^a-zA-Z0-9]/g, "") ?? null : null, legalName: input.fiscal.requested ? input.fiscal.legalName : null, tradeName: null, stateRegistration: null, municipalRegistration: null, email: input.fiscal.requested ? input.customer.email : null, phone: input.fiscal.requested ? input.customer.phone : null, address: null }), timestamp, timestamp);
      db.prepare(
        `INSERT INTO fulfillments (
          id, order_id, method, provider, service_code, shipment_id,
          tracking_code, status, quote_snapshot_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'PENDING', ?, ?)`,
      ).run(domainId("fulfillment"), orderId, input.fulfillment.method,
        input.fulfillment.method === "SHIPPING" ? "melhor-envio" : null,
        typeof quoteSnapshot.serviceCode === "string" ? quoteSnapshot.serviceCode : null,
        JSON.stringify(quoteSnapshot), timestamp);
      db.prepare(
        `INSERT INTO order_events (id, order_id, type, description, metadata_json, created_at)
         VALUES (?, ?, 'ORDER_CREATED', 'Pedido criado a partir do carrinho.', ?, ?)`,
      ).run(domainId("order_event"), orderId, JSON.stringify({ itemCount: input.lines.length, paymentMethod: input.paymentMethod }), timestamp);
      writeAudit(db, { actorId: input.customer.id, action: "COMMERCE_ORDER_CREATED", entityType: "Order", entityId: orderId, after: { code: orderCode, itemCount: input.lines.length, totalCents } });
    })();
    await Promise.all(
      input.lines
        .filter((line) => line.artworkAssetId)
        .map((line) => markStoredArtworkClaimed(line.artworkAssetId!)),
    );
  } finally {
    db.close();
  }

  try {
    const payment = await getCommercePaymentGateway().createPayment({
      merchantOrderId: orderId,
      idempotencyKey: `order:${orderId}:payment:1`,
      items: input.lines.map((line) => ({ referenceId: line.variant?.sku ?? line.product.code, title: line.product.name, quantity: line.quantity, unitPriceCents: line.unitPriceCents })),
      shippingCents,
      totalCents,
      method: input.paymentMethod,
      customer: { name: input.customer.name, email: input.customer.email, document: input.customer.document },
      cardToken: input.cardToken,
      cardPaymentMethodId: input.cardPaymentMethodId,
      installments: input.installments,
    });
    const paymentDb = openDatabase();
    try {
      const attempts = new PaymentAttemptRepository(paymentDb);
      const attempt = attempts.create({
        orderId,
        provider: payment.provider,
        providerReference: payment.externalId,
        idempotencyKey: `order:${orderId}:payment:1`,
        amountCents: totalCents,
        expiresAt: payment.expiresAt,
        metadata: { payment, method: input.paymentMethod },
      }, input.customer.id);
      if (payment.status === "PAID") attempts.transition(attempt.id, "PAID", "payment-api");
      if (payment.status === "FAILED") attempts.transition(attempt.id, "FAILED", "payment-api");
      paymentDb.prepare("UPDATE carts SET status = 'CONVERTED', updated_at = ? WHERE id = ?")
        .run(nowIso(), input.cart.id);
    } finally { paymentDb.close(); }
    return { orderId, orderCode, payment };
  } catch (error) {
    const recoveryDb = openDatabase();
    try {
      recoveryDb.transaction(() => {
        const timestamp = nowIso();
        const variants = recoveryDb.prepare(
          `SELECT item.variant_id, item.quantity FROM order_items item
           JOIN product_variants variant ON variant.id = item.variant_id
           WHERE item.order_id = ? AND variant.stock_mode = 'TRACKED'`,
        ).all(orderId) as Array<{ variant_id: string; quantity: number }>;
        variants.forEach((variant) => {
          recoveryDb.prepare("UPDATE product_variants SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?")
            .run(variant.quantity, timestamp, variant.variant_id);
          recoveryDb.prepare(
            `INSERT INTO inventory_movements (id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at)
             VALUES (?, ?, ?, 'RELEASE', ?, 'Falha ao criar pagamento', 'payment-api', ?)`,
          ).run(domainId("inventory"), variant.variant_id, orderId, variant.quantity, timestamp);
        });
        recoveryDb.prepare("UPDATE orders SET payment_status = 'FAILED', production_status = 'CANCELLED', updated_at = ? WHERE id = ?")
          .run(timestamp, orderId);
      })();
    } finally { recoveryDb.close(); }
    throw error;
  }
}
