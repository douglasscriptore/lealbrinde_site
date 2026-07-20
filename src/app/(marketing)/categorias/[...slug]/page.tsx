import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/commerce";
import { getCatalog } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const categorySlug = slug.at(-1)!;
  const { categories } = getCatalog({ categoria: categorySlug });
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) return {};
  return { title: category.seo.title, description: category.seo.description, alternates: { canonical: `/categorias/${slug.join("/")}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categorySlug = slug.at(-1)!;
  const result = getCatalog({ categoria: categorySlug });
  if (!result.categories.some((category) => category.slug === categorySlug)) notFound();
  return <CatalogView products={result.products} categories={result.categories} query={{ categoria: categorySlug }} />;
}
