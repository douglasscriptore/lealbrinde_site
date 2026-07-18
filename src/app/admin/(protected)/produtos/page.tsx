import type { Metadata } from "next";

import { ProductList } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminProductList } from "@/server/queries/admin-operations";

export const metadata: Metadata = { title: "Produtos" };

type ProductsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  await requireStaff(["ADMIN"]);
  const { q } = await searchParams;
  const products = await getAdminProductList(q);

  return (
    <ProductList
      createHref="/admin/produtos/novo"
      products={products}
      query={q}
    />
  );
}
