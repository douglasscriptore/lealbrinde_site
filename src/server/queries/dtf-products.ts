import "server-only";
import { openDatabase, ProductRepository } from "@/server/db";
import type { DtfProductAggregate, PriceTable } from "@/domain";
import { isProductOrderable } from "@/server/product-availability";

function selectCurrentPriceTable(aggregate: DtfProductAggregate): PriceTable | null {
  const now = new Date().toISOString();
  return (
    aggregate.priceTables.find(
      (table) =>
        table.status === "PUBLISHED" &&
        (!table.validFrom || table.validFrom <= now) &&
        (!table.validUntil || table.validUntil > now),
    ) ??
    aggregate.priceTables.find((table) => table.status === "DRAFT") ??
    null
  );
}

export function getFeaturedDtfProduct() {
  const db = openDatabase();
  try {
    const products = new ProductRepository(db);
    const availableProducts = products
      .list({ type: "DTF_BY_METER" })
      .filter((candidate) => isProductOrderable(candidate.status));
    const product =
      availableProducts.find((candidate) => candidate.featured) ??
      availableProducts[0];
    if (!product) return null;
    const aggregate = products.getDtfAggregate(product.id);
    if (!aggregate) return null;
    return { aggregate, priceTable: selectCurrentPriceTable(aggregate) };
  } finally {
    db.close();
  }
}

export function getDtfProductBySlug(slug: string) {
  const db = openDatabase();
  try {
    const products = new ProductRepository(db);
    const product = products.findBySlug(slug);
    if (
      !product ||
      product.type !== "DTF_BY_METER" ||
      !isProductOrderable(product.status)
    ) {
      return null;
    }
    const aggregate = products.getDtfAggregate(product.id);
    if (!aggregate) return null;
    return { aggregate, priceTable: selectCurrentPriceTable(aggregate) };
  } finally {
    db.close();
  }
}

export function listPublishedDtfProductSlugs() {
  const db = openDatabase();
  try {
    const products = new ProductRepository(db);
    return products
      .list({ type: "DTF_BY_METER", status: "PUBLISHED" })
      .map((product) => product.slug)
      .filter((slug) => /^\/dtf\/[^/]+$/.test(slug));
  } finally {
    db.close();
  }
}

export function toMarketingPriceTiers(priceTable: PriceTable | null) {
  return (priceTable?.tiers ?? []).map((tier) => ({
    id: tier.id,
    minimumMeters: tier.minimumMeters,
    maximumMeters:
      tier.maximumExclusiveMeters === null ? null : tier.maximumExclusiveMeters - 1,
    unitPriceCents: tier.unitPriceCents,
  }));
}
