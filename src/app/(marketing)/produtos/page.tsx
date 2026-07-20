import type { Metadata } from "next";

import { CatalogView } from "@/components/commerce";
import { getCatalog, type CatalogQuery } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Produtos personalizados",
  description: "Catálogo de brindes, personalizados e materiais Leal Brinde para empresas, eventos e equipes.",
  alternates: { canonical: "/produtos" },
};
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = await searchParams;
  const { products, categories } = getCatalog(query);
  return <CatalogView products={products} categories={categories} query={query} />;
}
