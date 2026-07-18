import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export type PixPaymentStatus = "PENDING_PIX" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED";

export type PixPayment = {
  externalId: string;
  externalReference: string;
  amountMinor: number;
  status: PixPaymentStatus;
  copyPasteCode: string;
  qrCodeBase64: string | null;
  expiresAt: string;
  provider: string;
  sandbox: boolean;
};

export interface PaymentGateway {
  createPix(input: {
    externalReference: string;
    idempotencyKey: string;
    amountMinor: number;
    payerEmail: string;
    expirationMinutes: number;
  }): Promise<PixPayment>;
  getStatus(externalId: string): Promise<PixPaymentStatus>;
  refund(input: {
    externalId: string;
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<{ refundId: string }>;
  verifyWebhook(request: Request): Promise<{ externalId: string; status: PixPaymentStatus }>;
}

class MockPaymentGateway implements PaymentGateway {
  async createPix(input: {
    externalReference: string;
    idempotencyKey: string;
    amountMinor: number;
    payerEmail: string;
    expirationMinutes: number;
  }) {
    const externalId = `mock_${createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 32)}`;
    return {
      externalId,
      externalReference: input.externalReference,
      amountMinor: input.amountMinor,
      status: "PENDING_PIX" as const,
      copyPasteCode: `LEALBRINDE-DEMO-${externalId}`,
      qrCodeBase64: null,
      expiresAt: new Date(
        Date.now() + input.expirationMinutes * 60 * 1000,
      ).toISOString(),
      provider: "mock",
      sandbox: true,
    };
  }

  async getStatus() {
    return "PENDING_PIX" as const;
  }

  async refund(input: { idempotencyKey: string }) {
    return {
      refundId: `refund_${createHash("sha256")
        .update(input.idempotencyKey)
        .digest("hex")
        .slice(0, 32)}`,
    };
  }

  async verifyWebhook(request: Request) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Webhooks simulados são proibidos em produção.");
    }

    const configuredSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
    const suppliedSecret = request.headers.get("x-lealbrinde-webhook-secret");
    if (!configuredSecret || !suppliedSecret) {
      throw new Error("Webhook de homologação não autorizado.");
    }
    const expected = Buffer.from(configuredSecret);
    const supplied = Buffer.from(suppliedSecret);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new Error("Webhook de homologação não autorizado.");
    }

    const body = (await request.json()) as { externalId?: string; status?: PixPaymentStatus };
    if (!body.externalId || body.status !== "PAID") {
      throw new Error("Evento de pagamento simulado inválido.");
    }

    return { externalId: body.externalId, status: body.status };
  }
}

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PIX_PROVIDER ?? "mock";
  if (provider === "mock") return new MockPaymentGateway();
  throw new Error(`Provedor Pix não configurado: ${provider}`);
}
