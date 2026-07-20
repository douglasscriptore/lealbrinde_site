import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductEditor, StandardProductAdmin, type ProductEditorTab } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { CommerceRepository, openDatabase } from "@/server/db";
import { getAdminDtfProduct, getAdminStandardProduct } from "@/server/queries/admin-operations";

import { adjustVariantInventoryAction, archiveStandardProductAction, createVariantPriceVersionAction, productEditorAction, publishStandardProductAction, saveProductSectionAction, updateStandardProductAction } from "../../actions";

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
  const [product, standard] = await Promise.all([getAdminDtfProduct(id), getAdminStandardProduct(id)]);
  if (standard) {
    const db = openDatabase();
    const categories = new CommerceRepository(db).listCategories().filter((category) => category.status !== "ARCHIVED");
    db.close();
    return <StandardProductAdmin aggregate={standard} categories={categories} updateAction={updateStandardProductAction} archiveAction={archiveStandardProductAction} publishAction={publishStandardProductAction} inventoryAction={adjustVariantInventoryAction} priceAction={createVariantPriceVersionAction} error={feedback.erro?.slice(0, 500)} success={feedback.sucesso?.slice(0, 300)} />;
  }
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
