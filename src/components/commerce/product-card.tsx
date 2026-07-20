import { ArrowRight, Package } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import type { StandardProductSummary } from "@/domain";
import { MotionSurface } from "@/components/motion";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductCard({ summary, featured = false }: { summary: StandardProductSummary; featured?: boolean }) {
  const { product } = summary;
  return (
    <MotionSurface className="group h-full">
      <Link href={product.slug} className="flex h-full flex-col rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <div className={`relative overflow-hidden rounded-card border border-border bg-surface-strong shadow-premium ${featured ? "min-h-[360px] flex-1 sm:min-h-[470px]" : "aspect-[4/3]"}`}>
          {product.mainImageUrl ? (
            <Image
              src={product.mainImageUrl}
              alt={product.gallery.find((media) => media.url === product.mainImageUrl)?.alt ?? product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-accent">
              <Package aria-hidden size={42} weight="duotone" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col px-1 pb-2 pt-5 sm:pt-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              {summary.primaryCategory ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{summary.primaryCategory.name}</p> : null}
              <h2 className={`mt-2 font-black tracking-[-0.035em] text-foreground ${featured ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"}`}>{product.name}</h2>
            </div>
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent shadow-premium transition-[transform,background-color,color] duration-fast group-hover:translate-x-1 group-hover:bg-accent group-hover:text-white">
              <ArrowRight aria-hidden size={19} weight="bold" />
            </span>
          </div>
          <p className={`mt-3 text-sm leading-6 text-muted ${featured ? "max-w-[58ch]" : "line-clamp-2"}`}>{product.summary}</p>
          <div className="mt-auto flex items-end justify-between gap-4 pt-5">
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-muted">{summary.minimumPriceCents === summary.maximumPriceCents ? "Por" : "A partir de"}</p>
              <p className={`${featured ? "text-2xl" : "text-xl"} font-black tabular-nums text-foreground`}>
                {summary.minimumPriceCents === null ? "Consulte" : money.format(summary.minimumPriceCents / 100)}
              </p>
            </div>
            <p className="text-xs font-semibold text-muted">{summary.available ? (summary.madeToOrder ? "Sob encomenda" : "Disponível") : "Indisponível"}</p>
          </div>
        </div>
      </Link>
    </MotionSurface>
  );
}
