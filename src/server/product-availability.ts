import "server-only";

import type { ProductStatus } from "@/domain";

export function isDraftCheckoutEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DRAFT_CHECKOUT === "true"
  );
}

export function isProductOrderable(status: ProductStatus): boolean {
  return status === "PUBLISHED" || (status === "DRAFT" && isDraftCheckoutEnabled());
}
