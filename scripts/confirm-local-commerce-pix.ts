import { createHmac } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("A confirmação simulada é proibida em produção.");
  }

  const orderCode = process.argv.slice(2).find((argument) => argument !== "--")?.trim();
  if (!orderCode) {
    throw new Error("Use: pnpm payment:confirm:local -- LB-ANO-CODIGO");
  }

  const [{ openDatabase, PaymentAttemptRepository, OrderRepository }] = await Promise.all([
    import("../src/server/db/index"),
  ]);
  const db = openDatabase();
  let paymentId: string;
  try {
    const order = new OrderRepository(db).findByCode(orderCode);
    if (!order) throw new Error("Pedido não encontrado.");
    const attempt = new PaymentAttemptRepository(db).listForOrder(order.id)[0];
    if (!attempt) throw new Error("O pedido ainda não possui uma cobrança.");
    if (attempt.status === "PAID") {
      console.log(`O pedido ${orderCode} já está pago.`);
      return;
    }
    if (attempt.status !== "PENDING") {
      throw new Error(`A cobrança está em ${attempt.status} e não pode ser confirmada.`);
    }
    paymentId = attempt.providerReference;
  } finally {
    db.close();
  }

  const secret = process.env.PAYMENT_API_WEBHOOK_SECRET ?? process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new Error("Configure PAYMENT_API_WEBHOOK_SECRET ou MOCK_PAYMENT_WEBHOOK_SECRET.");
  const rawBody = JSON.stringify({
    eventId: `homologation:${paymentId}:PAID`,
    type: "payment.updated",
    paymentId,
    status: "PAID",
    occurredAt: new Date().toISOString(),
  });
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const response = await fetch(`${siteUrl}/api/webhooks/payment-api`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-leal-signature": `sha256=${signature}`,
    },
    body: rawBody,
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Webhook respondeu HTTP ${response.status}.`);
  }
  console.log(`Pix do pedido ${orderCode} confirmado pelo webhook de homologação.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
