import "server-only";

import type { StandardProductAggregate, StandardProductSummary } from "@/domain";
import { CommerceRepository, openDatabase } from "@/server/db";

export type CatalogQuery = {
  q?: string;
  categoria?: string;
  disponibilidade?: string;
  precoMin?: string;
  precoMax?: string;
  ordem?: string;
  pagina?: string;
};

function moneyFilter(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

export function getCatalog(query: CatalogQuery = {}): {
  products: StandardProductSummary[];
  categories: ReturnType<CommerceRepository["listCategories"]>;
  settings: ReturnType<CommerceRepository["getSettings"]>;
  page: number;
} {
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    const page = Math.max(Number(query.pagina) || 1, 1);
    return {
      products: commerce.listCatalog({
        search: query.q,
        categorySlug: query.categoria,
        availability: query.disponibilidade === "disponivel" ? "AVAILABLE" : undefined,
        minimumPriceCents: moneyFilter(query.precoMin),
        maximumPriceCents: moneyFilter(query.precoMax),
        sort:
          query.ordem === "menor-preco"
            ? "PRICE_ASC"
            : query.ordem === "maior-preco"
              ? "PRICE_DESC"
              : query.ordem === "recentes"
                ? "NEWEST"
                : "FEATURED",
        limit: 24,
        offset: (page - 1) * 24,
      }),
      categories: commerce.listCategories(true),
      settings: commerce.getSettings(),
      page,
    };
  } finally {
    db.close();
  }
}

export function getStandardProductBySlug(slug: string): StandardProductAggregate | null {
  const db = openDatabase();
  try {
    const aggregate = new CommerceRepository(db).findStandardProductBySlug(`/produtos/${slug}`);
    if (
      !aggregate
      || aggregate.product.status !== "PUBLISHED"
      || !aggregate.categories.some((category) => category.status === "PUBLISHED")
    ) return null;
    return aggregate;
  } finally {
    db.close();
  }
}
