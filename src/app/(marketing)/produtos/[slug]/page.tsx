import { ArrowLeft, CheckCircle, MapPin, Package, ShieldCheck, Truck } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/commerce";
import { Reveal } from "@/components/marketing";
import { getStandardProductBySlug } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const aggregate = getStandardProductBySlug((await params).slug);
  if (!aggregate) return {};
  return { title: aggregate.product.seo.title, description: aggregate.product.seo.description, alternates: { canonical: aggregate.product.seo.canonicalPath }, openGraph: { images: aggregate.product.seo.socialImageUrl ? [aggregate.product.seo.socialImageUrl] : [] } };
}

export default async function StandardProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const aggregate = getStandardProductBySlug((await params).slug);
  if (!aggregate) notFound();
  const { product, configuration } = aggregate;
  const available = aggregate.variants.some((variant) => variant.active && (variant.stockMode === "MADE_TO_ORDER" || (variant.availableQuantity ?? 0) > variant.reservedQuantity));
  const pickupEnabled = configuration.fulfillmentOptions.includes("PICKUP");
  const shippingEnabled = configuration.fulfillmentOptions.includes("SHIPPING");
  const FulfillmentIcon = shippingEnabled ? Truck : MapPin;
  const fulfillmentLabel = pickupEnabled && shippingEnabled
    ? "Retirada ou entrega"
    : shippingEnabled
      ? "Entrega nacional"
      : "Retirada local";
  const minimum = Math.min(...aggregate.variants.filter((variant) => variant.active).map((variant) => variant.basePriceCents));
  const gallery = product.gallery.slice(0, 4);
  const structuredData = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.summary, image: product.mainImageUrl ? [product.mainImageUrl] : undefined, sku: aggregate.variants[0]?.sku, offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: (minimum / 100).toFixed(2), availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: product.seo.canonicalPath } };

  return (
    <main id="conteudo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <section className="bg-surface-subtle pb-14 pt-6 sm:pb-20 sm:pt-8">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <Link href="/produtos" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-muted transition-colors hover:text-accent"><ArrowLeft aria-hidden size={17} />Voltar ao catálogo</Link>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-start">
          <Reveal variant="scale" className="grid gap-3 sm:grid-cols-[5.5rem_1fr]">
            {gallery.length > 1 ? <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">{gallery.map((media) => <div key={media.id} className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-control border border-border bg-white"><Image src={media.url} alt={media.alt} fill sizes="80px" className="object-cover" /></div>)}</div> : null}
            <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-card border border-white bg-surface-strong shadow-float sm:order-2">
              {product.mainImageUrl ? <Image src={product.mainImageUrl} alt={product.gallery.find((media) => media.url === product.mainImageUrl)?.alt ?? product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /> : <div className="grid h-full place-items-center text-accent"><Package aria-hidden size={64} weight="duotone" /></div>}
            </div>
          </Reveal>
          <Reveal delay={80} className="lg:sticky lg:top-28">
            {aggregate.categories[0] ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{aggregate.categories[0].name}</p> : null}
            <h1 className="mt-4 text-balance text-5xl font-black leading-[0.98] tracking-[-0.05em] text-foreground sm:text-6xl">{product.name}</h1>
            <p className="mt-5 text-base leading-7 text-muted">{product.summary}</p>
            <div className="mt-6 grid gap-3 text-sm font-semibold text-foreground sm:grid-cols-2">
              <span className="inline-flex items-center gap-2"><CheckCircle aria-hidden className="text-success" size={18} weight="fill" />Preço confirmado</span>
              <span className="inline-flex items-center gap-2"><FulfillmentIcon aria-hidden className="text-accent" size={18} />{fulfillmentLabel}</span>
              <span className="inline-flex items-center gap-2 sm:col-span-2"><ShieldCheck aria-hidden className="text-accent" size={18} />Compra registrada na sua conta</span>
            </div>
            <div className="mt-8"><ProductConfigurator productId={product.id} options={aggregate.options} variants={aggregate.variants} fields={aggregate.personalizationFields} /></div>
          </Reveal>
        </div>
        </div>
      </section>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            <div className="max-w-3xl"><h2 className="text-4xl font-black tracking-[-0.04em]">Detalhes do produto</h2><p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">{product.description}</p></div>
            <div className="divide-y divide-border border-y border-border">
              <div className="py-6"><h3 className="font-black">Produção</h3><p className="mt-2 text-sm leading-6 text-muted">Prazo estimado em {configuration.leadTimeBusinessDays} dias úteis após pagamento e aprovação, quando necessária.</p></div>
              <div className="py-6"><h3 className="font-black">Personalização</h3><p className="mt-2 text-sm leading-6 text-muted">{configuration.personalizationMode === "NONE" ? "Este produto não exige personalização." : "Os dados enviados ficam registrados no item do pedido para conferência."}</p></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
