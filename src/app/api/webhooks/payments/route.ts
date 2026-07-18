import { NextResponse } from "next/server";

import type { PaymentAttemptStatus } from "@/domain";
import {
  openDatabase,
  OrderRepository,
  PaymentAttemptRepository,
  ProductRepository,
} from "@/server/db";
import { getPaymentGateway, type PixPaymentStatus } from "@/server/integrations/payment-gateway";

export const runtime = "nodejs";

const attemptStatus: Record<PixPaymentStatus, PaymentAttemptStatus> = {
  PENDING_PIX: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

export async function POST(request: Request) {
  try {
    const gateway = getPaymentGateway();
    const event = await gateway.verifyWebhook(request);
    const provider = process.env.PIX_PROVIDER ?? "mock";
    const db = openDatabase();

    try {
      const payments = new PaymentAttemptRepository(db);
      const payment = payments.findByProviderReference(provider, event.externalId);
      if (!payment) {
        return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });
      }

      const updated = payments.transition(
        payment.id,
        attemptStatus[event.status],
        "payment-webhook",
        { lastWebhookAt: new Date().toISOString() },
      );
      if (updated.status === "PAID") {
        const orders = new OrderRepository(db);
        const order = orders.findById(updated.orderId);
        const configuredThreshold = order
          ? new ProductRepository(db).getDtfAggregate(order.productId)
              ?.productionPolicy?.customLeadTimeAboveMeters
          : null;
        const customLeadTimeAboveMeters =
          typeof configuredThreshold === "number" &&
          Number.isInteger(configuredThreshold) &&
          configuredThreshold > 0
            ? configuredThreshold
            : 100;
        if (
          order?.artworkStatus === "APPROVED" &&
          order.productionStatus === "BLOCKED" &&
          order.quantityMeters <= customLeadTimeAboveMeters
        ) {
          orders.updateStatuses(
            order.id,
            { productionStatus: "QUEUED" },
            "payment-webhook",
          );
        }
      }
      return NextResponse.json({ received: true, status: updated.status });
    } finally {
      db.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook inválido." },
      { status: 400 },
    );
  }
}
