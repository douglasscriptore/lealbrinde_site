import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DtfProductDetail } from "@/components/marketing";
import { getDtfProductBySlug } from "@/server/queries/dtf-products";

export const dynamic = "force-dynamic";

type DtfProductRouteProps = {
  params: Promise<{ slug: string }>;
};

function toProductPath(slug: string) {
  return `/dtf/${slug}`;
}

export async function generateMetadata({
  params,
}: DtfProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const result = getDtfProductBySlug(toProductPath(slug));
  if (!result) notFound();

  const { product } = result.aggregate;
  return {
    title: product.seo.title.replace(" | Leal Brinde", ""),
    description: product.seo.description,
    alternates: { canonical: product.seo.canonicalPath },
    robots:
      product.status === "PUBLISHED"
        ? undefined
        : { index: false, follow: false },
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      images: [
        product.seo.socialImageUrl ?? "/images/dtf-hero-campaign.png",
      ],
    },
  };
}

export default async function DtfProductRoute({
  params,
}: DtfProductRouteProps) {
  const { slug } = await params;
  const result = getDtfProductBySlug(toProductPath(slug));
  if (!result || !result.priceTable) notFound();

  return (
    <DtfProductDetail
      aggregate={result.aggregate}
      priceTable={result.priceTable}
    />
  );
}
