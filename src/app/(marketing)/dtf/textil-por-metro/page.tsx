import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DtfProductDetail } from "@/components/marketing";
import { getDtfProductBySlug } from "@/server/queries/dtf-products";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const result = getDtfProductBySlug("/dtf/textil-por-metro");
  if (!result) return { title: "DTF Têxtil por Metro" };
  const { product } = result.aggregate;
  return {
    title: product.seo.title.replace(" | Leal Brinde", ""),
    description: product.seo.description,
    alternates: { canonical: product.seo.canonicalPath },
    robots: product.status === "PUBLISHED" ? undefined : { index: false, follow: false },
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      images: [product.seo.socialImageUrl ?? "/images/dtf-hero-campaign.png"],
    },
  };
}

export default function DtfTextileProductPage() {
  const result = getDtfProductBySlug("/dtf/textil-por-metro");
  if (!result || !result.priceTable) notFound();

  return (
    <DtfProductDetail
      aggregate={result.aggregate}
      priceTable={result.priceTable}
    />
  );
}
