import type {
  ArtworkStatus,
  FulfillmentStatus,
  Order,
  PaymentStatus,
  ProductionStatus,
} from "./types";

export type CustomerOrderStatus =
  | "PAYMENT_PENDING"
  | "ARTWORK_RECEIVED"
  | "ARTWORK_CHANGES_REQUESTED"
  | "ARTWORK_APPROVED"
  | "IN_PRODUCTION"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export function canEnterProduction(
  paymentStatus: PaymentStatus,
  artworkStatus: ArtworkStatus,
): boolean {
  return paymentStatus === "PAID" && artworkStatus === "APPROVED";
}

export function assertProductionInvariant(
  paymentStatus: PaymentStatus,
  artworkStatus: ArtworkStatus,
  productionStatus: ProductionStatus,
): void {
  const requiresRelease = [
    "QUEUED",
    "IN_PRODUCTION",
    "READY",
    "COMPLETED",
  ].includes(productionStatus);

  if (requiresRelease && !canEnterProduction(paymentStatus, artworkStatus)) {
    throw new Error(
      "A produção só pode avançar com pagamento confirmado e arte aprovada.",
    );
  }
}

export function deriveCustomerOrderStatus(
  order: Pick<
    Order,
    | "paymentStatus"
    | "artworkStatus"
    | "productionStatus"
    | "fulfillmentStatus"
  >,
): CustomerOrderStatus {
  if (order.productionStatus === "CANCELLED") return "CANCELLED";
  if (["DELIVERED", "PICKED_UP"].includes(order.fulfillmentStatus)) {
    return "COMPLETED";
  }
  if (order.fulfillmentStatus === "SHIPPED") return "SHIPPED";
  if (order.fulfillmentStatus === "READY_FOR_PICKUP") {
    return "READY_FOR_PICKUP";
  }
  if (["IN_PRODUCTION", "READY", "COMPLETED"].includes(order.productionStatus)) {
    return "IN_PRODUCTION";
  }
  if (order.artworkStatus === "CHANGES_REQUESTED") {
    return "ARTWORK_CHANGES_REQUESTED";
  }
  if (order.artworkStatus === "APPROVED") return "ARTWORK_APPROVED";
  if (order.paymentStatus !== "PAID") return "PAYMENT_PENDING";
  return "ARTWORK_RECEIVED";
}

export function shouldRequireManualLeadTime(
  quantityMeters: number,
  customLeadTimeAboveMeters = 100,
): boolean {
  return quantityMeters > customLeadTimeAboveMeters;
}

export function isFulfillmentComplete(status: FulfillmentStatus): boolean {
  return status === "DELIVERED" || status === "PICKED_UP";
}
