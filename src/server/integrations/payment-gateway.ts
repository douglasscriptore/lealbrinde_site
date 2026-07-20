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

export type CommercePaymentInput = {
  merchantOrderId: string;
  idempotencyKey: string;
  items: Array<{ referenceId: string; title: string; quantity: number; unitPriceCents: number }>;
  shippingCents: number;
  totalCents: number;
  method: "PIX" | "CREDIT_CARD";
  customer: { name: string; email: string; document: string };
  cardToken?: string;
  cardPaymentMethodId?: string;
  installments?: number;
};

export type CommercePaymentResult = {
  externalId: string;
  status: "PENDING" | "PAID" | "FAILED";
  provider: string;
  expiresAt: string | null;
  pix: { copyPasteCode: string; qrCodeBase64: string | null } | null;
  metadata: Record<string, unknown>;
};

export interface CommercePaymentGateway {
  createPayment(input: CommercePaymentInput): Promise<CommercePaymentResult>;
  installmentOptions(amountCents: number): Promise<Array<{ installments: number; installmentCents: number; totalCents: number }>>;
  updateSettings(input: { maxInstallments: number; statementDescriptor: string; cardEnabled: boolean }): Promise<void>;
}

class MockCommercePaymentGateway implements CommercePaymentGateway {
  async createPayment(input: CommercePaymentInput): Promise<CommercePaymentResult> {
    const externalId = `commerce_mock_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 24)}`;
    return {
      externalId,
      status: input.method === "CREDIT_CARD" ? "PAID" : "PENDING",
      provider: "mock",
      expiresAt: input.method === "PIX" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
      pix: input.method === "PIX" ? { copyPasteCode: `LEALBRINDE-DEMO-${externalId}`, qrCodeBase64: null } : null,
      metadata: { sandbox: true, method: input.method, installments: input.installments ?? 1 },
    };
  }
  async installmentOptions(amountCents: number) {
    return Array.from({ length: 3 }, (_, index) => ({ installments: index + 1, installmentCents: Math.ceil(amountCents / (index + 1)), totalCents: amountCents }));
  }
  async updateSettings() {}
}

class PaymentApiCommerceGateway implements CommercePaymentGateway {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}
  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { accept: "application/json", "content-type": "application/json", "x-api-key": this.apiKey, ...init?.headers },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const detail = [payload.message, payload.description, payload.detail, payload.status_detail].find((value) => typeof value === "string");
      throw new Error(typeof detail === "string" ? detail : "O provedor recusou a operação de pagamento.");
    }
    return payload;
  }
  async createPayment(input: CommercePaymentInput): Promise<CommercePaymentResult> {
    const payload = await this.request("/v2/payments", { method: "POST", body: JSON.stringify({ merchantId: "lealbrinde", ...input }) });
    return {
      externalId: String(payload.id ?? payload.externalId),
      status: String(payload.status) as CommercePaymentResult["status"],
      provider: "mercado-pago",
      expiresAt: payload.expiresAt ? String(payload.expiresAt) : null,
      pix: payload.pix && typeof payload.pix === "object" ? payload.pix as CommercePaymentResult["pix"] : null,
      metadata: { paymentApi: true },
    };
  }
  async installmentOptions(amountCents: number) {
    const payload = await this.request(`/payments/installment-options?hubId=lealbrinde&amount=${(amountCents / 100).toFixed(2)}`);
    return (Array.isArray(payload.options) ? payload.options : []) as Array<{ installments: number; installmentCents: number; totalCents: number }>;
  }
  async updateSettings(input: { maxInstallments: number; statementDescriptor: string; cardEnabled: boolean }) {
    await this.request("/admin/hubs/lealbrinde/payment-settings", { method: "PUT", body: JSON.stringify({ ...input, serviceFee: 0 }) });
  }
}

export function getCommercePaymentGateway(): CommercePaymentGateway {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  if (baseUrl && apiKey) return new PaymentApiCommerceGateway(baseUrl.replace(/\/$/, ""), apiKey);
  if (process.env.NODE_ENV === "production") throw new Error("Configure PAYMENT_API_URL e PAYMENT_API_KEY.");
  return new MockCommercePaymentGateway();
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
