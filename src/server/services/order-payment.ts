import "server-only";

import type { Order, PaymentAttempt, PaymentAttemptStatus } from "@/domain";
import type { CheckoutPixPayment } from "@/components/checkout";
import {
  openDatabase,
  PaymentAttemptRepository,
  ProductRepository,
} from "@/server/db";
import { getPaymentGateway, type PixPayment } from "@/server/integrations/payment-gateway";

const paymentStatusMap: Record<PaymentAttemptStatus, CheckoutPixPayment["status"]> = {
  PENDING: "PENDING_PIX",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

function isStoredPayment(value: unknown): value is PixPayment {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PixPayment>;
  return (
    typeof candidate.externalId === "string" &&
    typeof candidate.externalReference === "string" &&
    typeof candidate.amountMinor === "number" &&
    typeof candidate.copyPasteCode === "string" &&
    typeof candidate.expiresAt === "string" &&
    typeof candidate.provider === "string" &&
    typeof candidate.sandbox === "boolean"
  );
}

function toCheckoutPayment(attempt: PaymentAttempt): CheckoutPixPayment {
  const stored = attempt.metadata.payment;
  if (!isStoredPayment(stored)) {
    throw new Error("Os dados da cobrança Pix estão incompletos.");
  }

  return {
    ...stored,
    status: paymentStatusMap[attempt.status],
  };
}

export async function ensurePixPayment(
  order: Order,
  payerEmail: string,
): Promise<CheckoutPixPayment> {
  const db = openDatabase();

  try {
    const attempts = new PaymentAttemptRepository(db);
    const paymentPolicy = new ProductRepository(db).getPaymentPolicy(order.productId);
    const existing = attempts.listForOrder(order.id)[0];

    if (existing?.status === "PENDING") {
      const expired =
        existing.expiresAt !== null &&
        new Date(existing.expiresAt).getTime() <= Date.now();

      if (!expired) return toCheckoutPayment(existing);
      attempts.transition(existing.id, "EXPIRED", "payment-expiration");
    } else if (existing?.status === "PAID" || existing?.status === "REFUNDED") {
      return toCheckoutPayment(existing);
    }

    const gateway = getPaymentGateway();
    const version = attempts.listForOrder(order.id).length + 1;
    const idempotencyKey = `order:${order.id}:pix:${version}`;
    const payment = await gateway.createPix({
      externalReference: order.code,
      idempotencyKey,
      amountMinor: order.priceSnapshot.subtotalCents,
      payerEmail,
      expirationMinutes: paymentPolicy.pixExpirationMinutes,
    });
    const attempt = attempts.create(
      {
        orderId: order.id,
        provider: payment.provider,
        providerReference: payment.externalId,
        idempotencyKey,
        amountCents: payment.amountMinor,
        expiresAt: payment.expiresAt,
        metadata: { payment },
      },
      "checkout",
    );

    return toCheckoutPayment(attempt);
  } finally {
    db.close();
  }
}
