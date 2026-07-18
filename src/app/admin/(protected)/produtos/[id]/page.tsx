import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductEditor, type ProductEditorTab } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminDtfProduct } from "@/server/queries/admin-operations";

import { productEditorAction, saveProductSectionAction } from "../../actions";

export const metadata: Metadata = { title: "Editar produto" };

type ProductEditorPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
};

export default async function AdminProductEditorPage({
  params,
  searchParams,
}: ProductEditorPageProps) {
  await requireStaff(["ADMIN"]);
  const [{ id }, feedback] = await Promise.all([params, searchParams]);
  const product = await getAdminDtfProduct(id);
  if (!product) notFound();

  const readOnlySections =
    product.status === "ARCHIVED"
      ? [
          "basic",
          "price",
          "specifications",
          "files",
          "production",
          "payment",
          "media",
          "seo",
          "publication",
        ] satisfies ProductEditorTab[]
      : [];
  const previewHref = product.slug.startsWith("/")
    ? product.slug
    : `/dtf/${product.slug}`;

  return (
    <ProductEditor
      onAction={productEditorAction}
      previewHref={previewHref}
      product={product}
      readOnlyMessage={
        product.status === "ARCHIVED"
          ? "Produtos arquivados permanecem somente para consulta. Duplique este produto para criar um novo rascunho."
          : undefined
      }
      readOnlySections={readOnlySections}
      saveAction={saveProductSectionAction}
      saveError={feedback.erro?.slice(0, 500)}
      savedMessage={feedback.sucesso?.slice(0, 300)}
    />
  );
}
