import "server-only";

import { createHash } from "node:crypto";

import {
  IntegrationNotConfiguredError,
  type ShippingProvider,
  type ShippingQuote,
} from "./ports";

class MockShippingProvider implements ShippingProvider {
  async quote(input: Parameters<ShippingProvider["quote"]>[0]): Promise<ShippingQuote[]> {
    const weight = input.items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
    const base = 1_490 + Math.ceil(weight / 500) * 250;
    return [
      { serviceCode: "mock-economico", label: "Entrega econômica", amountMinor: base, estimatedBusinessDays: 7 },
      { serviceCode: "mock-expresso", label: "Entrega expressa", amountMinor: base + 1_200, estimatedBusinessDays: 3 },
    ];
  }
  async createShipment(orderId: string) {
    const digest = createHash("sha256").update(orderId).digest("hex").slice(0, 12).toUpperCase();
    return { shipmentId: `mock_${digest}`, trackingCode: `LB${digest}BR` };
  }
  async track() {
    return { status: "PENDING", updatedAt: new Date().toISOString() };
  }
}

class MelhorEnvioProvider implements ShippingProvider {
  constructor(private readonly token: string, private readonly baseUrl: string) {}

  async quote(input: Parameters<ShippingProvider["quote"]>[0]): Promise<ShippingQuote[]> {
    const response = await fetch(`${this.baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": process.env.MELHOR_ENVIO_USER_AGENT ?? "Leal Brinde contato@lealbrinde.com.br",
      },
      body: JSON.stringify({
        from: { postal_code: input.origin.postalCode.replace(/\D/g, "") },
        to: { postal_code: input.destination.postalCode.replace(/\D/g, "") },
        products: input.items.map((item) => ({
          id: item.referenceId,
          width: item.widthCm,
          height: item.heightCm,
          length: item.lengthCm,
          weight: item.weightGrams / 1000,
          insurance_value: item.unitPriceCents / 100,
          quantity: item.quantity,
        })),
        options: { receipt: false, own_hand: false, collect: false },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Não foi possível consultar o Melhor Envio agora.");
    const payload = await response.json() as Array<Record<string, unknown>>;
    return payload.flatMap((service) => {
      const price = Number(service.custom_price ?? service.price);
      const days = Number(service.custom_delivery_time ?? service.delivery_time);
      if (!service.id || !service.name || !Number.isFinite(price) || !Number.isFinite(days) || service.error) return [];
      return [{ serviceCode: String(service.id), label: String(service.name), amountMinor: Math.round(price * 100), estimatedBusinessDays: Math.max(Math.round(days), 0) }];
    });
  }

  async createShipment(): Promise<{ shipmentId: string; trackingCode: string }> {
    throw new IntegrationNotConfiguredError("compra de etiqueta do Melhor Envio pelo painel");
  }

  async track(): Promise<{ status: string; updatedAt: string }> {
    throw new IntegrationNotConfiguredError("rastreamento do Melhor Envio");
  }
}

export function getShippingProvider(): ShippingProvider {
  const mode = process.env.SHIPPING_PROVIDER ?? "mock";
  if (mode === "mock") {
    if (process.env.NODE_ENV === "production") throw new Error("O frete simulado é proibido em produção.");
    return new MockShippingProvider();
  }
  if (mode === "melhor-envio") {
    const token = process.env.MELHOR_ENVIO_TOKEN;
    if (!token) throw new IntegrationNotConfiguredError("token do Melhor Envio");
    return new MelhorEnvioProvider(token, process.env.MELHOR_ENVIO_BASE_URL ?? "https://melhorenvio.com.br");
  }
  throw new IntegrationNotConfiguredError(`provedor de frete ${mode}`);
}
