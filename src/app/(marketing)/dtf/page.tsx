import { redirect } from "next/navigation";
import { getFeaturedDtfProduct } from "@/server/queries/dtf-products";

export default async function DtfIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string }>;
}) {
  const query = await searchParams;
  const featured = getFeaturedDtfProduct();
  const destination = featured?.aggregate.product.slug ?? "/dtf/textil-por-metro";
  redirect(`${destination}${query.acao === "calcular" ? "#calcular" : ""}`);
}
