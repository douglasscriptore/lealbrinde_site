import "server-only";

export type ShippingQuote = {
  serviceCode: string;
  label: string;
  amountMinor: number;
  estimatedBusinessDays: number;
};

export interface ShippingProvider {
  quote(input: { postalCode: string; weightGrams: number }): Promise<ShippingQuote[]>;
  createShipment(orderId: string): Promise<{ shipmentId: string; trackingCode: string }>;
  track(shipmentId: string): Promise<{ status: string; updatedAt: string }>;
}

export interface NotificationService {
  send(input: {
    recipient: string;
    template: string;
    variables: Record<string, string>;
  }): Promise<{ messageId: string }>;
}

export interface CommerceConnector {
  getDestination(context: "GIFTS" | "DTF"): Promise<{ href: string; mode: "INTERNAL" | "EXTERNAL" }>;
}

export interface FiscalIntegration {
  publish(documentId: string): Promise<{ externalId: string }>;
}

export interface Analytics {
  track(event: string, properties: Record<string, string | number | boolean>): Promise<void>;
}

export class IntegrationNotConfiguredError extends Error {
  constructor(integration: string) {
    super(`Integração ainda não configurada: ${integration}`);
    this.name = "IntegrationNotConfiguredError";
  }
}
