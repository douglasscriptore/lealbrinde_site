import type { Metadata } from "next";
import { CatalogView } from "@/components/commerce";
import { getCatalog, type CatalogQuery } from "@/server/queries/catalog";

export const metadata: Metadata = { title: "Buscar produtos", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = await searchParams;
  const { products, categories } = getCatalog(query);
  return <CatalogView products={products} categories={categories} query={query} />;
}
