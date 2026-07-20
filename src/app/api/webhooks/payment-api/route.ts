import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { PaymentAttemptStatus } from "@/domain";
import { openDatabase, PaymentAttemptRepository } from "@/server/db";
import { domainId, nowIso, writeAudit } from "@/server/db/repository-helpers";

export const runtime = "nodejs";

const eventSchema = z.object({
  eventId: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(200),
  status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED", "FAILED", "REFUNDED"]),
  occurredAt: z.string().datetime().optional(),
});

const statusMap: Partial<Record<z.infer<typeof eventSchema>["status"], PaymentAttemptStatus>> = {
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  CANCELLED: "FAILED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

function verifySignature(rawBody: string, received: string | null) {
  const secret = process.env.PAYMENT_API_WEBHOOK_SECRET ??
    (process.env.NODE_ENV !== "production" ? process.env.MOCK_PAYMENT_WEBHOOK_SECRET : undefined);
  if (!secret || !received) throw new Error("Assinatura do webhook ausente.");
  const normalized = received.startsWith("sha256=") ? received.slice(7) : received;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(normalized);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error("Assinatura do webhook inválida.");
  }
}

function releaseReservations(db: ReturnType<typeof openDatabase>, orderId: string, reason: string) {
  const variants = db.prepare(
    `SELECT item.variant_id, item.quantity FROM order_items item
     JOIN product_variants variant ON variant.id = item.variant_id
     WHERE item.order_id = ? AND variant.stock_mode = 'TRACKED'`,
  ).all(orderId) as Array<{ variant_id: string; quantity: number }>;
  const timestamp = nowIso();
  variants.forEach((variant) => {
    db.prepare(
      `UPDATE product_variants
       SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ?
       WHERE id = ?`,
    ).run(variant.quantity, timestamp, variant.variant_id);
    db.prepare(
      `INSERT INTO inventory_movements (
        id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
      ) VALUES (?, ?, ?, 'RELEASE', ?, ?, 'payment-webhook', ?)`,
    ).run(domainId("inventory"), variant.variant_id, orderId, variant.quantity, reason, timestamp);
  });
}

function commitReservations(db: ReturnType<typeof openDatabase>, orderId: string) {
  const variants = db.prepare(
    `SELECT item.variant_id, item.quantity FROM order_items item
     JOIN product_variants variant ON variant.id = item.variant_id
     WHERE item.order_id = ? AND variant.stock_mode = 'TRACKED'`,
  ).all(orderId) as Array<{ variant_id: string; quantity: number }>;
  const timestamp = nowIso();
  variants.forEach((variant) => {
    const changed = db.prepare(
      `UPDATE product_variants
       SET available_quantity = available_quantity - ?,
           reserved_quantity = reserved_quantity - ?,
           updated_at = ?
       WHERE id = ? AND available_quantity >= ? AND reserved_quantity >= ?`,
    ).run(variant.quantity, variant.quantity, timestamp, variant.variant_id, variant.quantity, variant.quantity);
    if (changed.changes !== 1) throw new Error("A reserva de estoque do pedido está inconsistente.");
    db.prepare(
      `INSERT INTO inventory_movements (
        id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
      ) VALUES (?, ?, ?, 'COMMITMENT', ?, 'Pagamento confirmado', 'payment-webhook', ?)`,
    ).run(domainId("inventory"), variant.variant_id, orderId, -variant.quantity, timestamp);
  });

  db.prepare(
    `UPDATE order_items SET production_status = 'QUEUED', updated_at = ?
     WHERE order_id = ? AND production_status = 'BLOCKED'
       AND artwork_status IN ('APPROVED', 'NOT_REQUIRED')`,
  ).run(timestamp, orderId);
  const blocked = db.prepare(
    "SELECT 1 FROM order_items WHERE order_id = ? AND production_status = 'BLOCKED' LIMIT 1",
  ).get(orderId);
  if (!blocked) {
    db.prepare("UPDATE orders SET production_status = 'QUEUED', updated_at = ? WHERE id = ?")
      .run(timestamp, orderId);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifySignature(rawBody, request.headers.get("x-leal-signature"));
    const parsed = eventSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) return NextResponse.json({ error: "Evento inválido." }, { status: 422 });
    const mappedStatus = statusMap[parsed.data.status];
    if (!mappedStatus) return NextResponse.json({ received: true, ignored: true });

    const db = openDatabase();
    try {
      const payloadHash = createHash("sha256").update(rawBody).digest("hex");
      const exists = db.prepare(
        "SELECT 1 FROM integration_events WHERE source = 'payment-api' AND external_event_id = ?",
      ).get(parsed.data.eventId);
      if (exists) return NextResponse.json({ received: true, duplicate: true });

      const payments = new PaymentAttemptRepository(db);
      const payment = payments.findByProviderReferenceAny(parsed.data.paymentId);
      if (!payment) return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });

      db.transaction(() => {
        const wasPaid = payment.status === "PAID";
        const updated = payments.transition(payment.id, mappedStatus, "payment-webhook", {
          eventId: parsed.data.eventId,
          occurredAt: parsed.data.occurredAt ?? nowIso(),
        });
        if (!wasPaid && updated.status === "PAID") commitReservations(db, updated.orderId);
        if (payment.status === "PENDING" && ["EXPIRED", "FAILED"].includes(updated.status)) {
          releaseReservations(db, updated.orderId, "Pagamento não concluído");
        }
        db.prepare(
          `INSERT INTO integration_events (
            id, source, external_event_id, event_type, payload_hash, processed_at
          ) VALUES (?, 'payment-api', ?, ?, ?, ?)`,
        ).run(domainId("integration_event"), parsed.data.eventId, parsed.data.type, payloadHash, nowIso());
        writeAudit(db, {
          actorId: "payment-webhook",
          action: "PAYMENT_API_EVENT_PROCESSED",
          entityType: "PaymentAttempt",
          entityId: payment.id,
          after: { eventId: parsed.data.eventId, status: updated.status },
        });
      })();
      return NextResponse.json({ received: true });
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
