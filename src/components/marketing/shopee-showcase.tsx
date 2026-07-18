import {
  ArrowSquareOut,
  CreditCard,
  ShoppingBagOpen,
  Star,
  Storefront,
  Tag,
  Truck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { shopeeStore } from "@/lib/marketplace";

import { Reveal } from "./reveal";

type ShopeeShowcaseProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
};

export function ShopeeShowcase({
  title = "Produtos Leal Brinde com a praticidade da Shopee",
  description = "Encontre brindes, etiquetas, estampas DTF prontas, produtos personalizados e muito mais em nossa loja oficial, com as condições informadas pela plataforma.",
  eyebrow = "Loja oficial na Shopee",
}: ShopeeShowcaseProps) {
  return (
    <section className="bg-[linear-gradient(180deg,var(--background),var(--marketplace-soft))] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal className="relative mx-auto max-w-shell overflow-hidden rounded-card bg-marketplace-strong shadow-[0_28px_80px_rgb(185_55_29/0.22)]">
        <ShoppingBagOpen
          aria-hidden="true"
          size={330}
          weight="thin"
          className="pointer-events-none absolute -right-16 -top-24 text-white/10"
        />
        <div className="relative grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-7 sm:p-10 lg:p-14 xl:p-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-marketplace-strong">
              <Storefront aria-hidden="true" size={17} weight="fill" />
              {eyebrow}
            </div>
            <h2 className="mt-7 max-w-[15ch] text-balance text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">
              {title}
            </h2>
            <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-white sm:text-lg">
              {description}
            </p>

            <div className="mt-8 grid max-w-2xl gap-2 sm:grid-cols-3" aria-label="Condições da loja na Shopee">
              <div className="flex items-center gap-2 rounded-control border border-white/20 bg-foreground/10 px-3 py-3 text-sm font-semibold text-white">
                <CreditCard aria-hidden="true" size={20} weight="duotone" />
                Pagamento na plataforma
              </div>
              <div className="flex items-center gap-2 rounded-control border border-white/20 bg-foreground/10 px-3 py-3 text-sm font-semibold text-white">
                <Tag aria-hidden="true" size={20} weight="duotone" />
                Descontos da Shopee
              </div>
              <div className="flex items-center gap-2 rounded-control border border-white/20 bg-foreground/10 px-3 py-3 text-sm font-semibold text-white">
                <Truck aria-hidden="true" size={20} weight="duotone" />
                Entrega pela Shopee
              </div>
            </div>

            <Link
              href={shopeeStore.url}
              target="_blank"
              rel="noreferrer"
              className="group mt-8 inline-flex min-h-13 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-black text-marketplace-strong shadow-[0_16px_36px_rgb(109_31_16/0.25)] transition-[transform,box-shadow] duration-(--duration-fast) ease-premium hover:-translate-y-1 hover:shadow-[0_22px_48px_rgb(109_31_16/0.32)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px active:scale-[0.98]"
            >
              Ver todos os produtos na Shopee
              <ArrowSquareOut
                aria-hidden="true"
                size={19}
                weight="bold"
                className="transition-transform duration-(--duration-fast) ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-white">
              Pagamento, descontos e entrega seguem as condições apresentadas pela Shopee.
            </p>
          </div>

          <div className="grid gap-3 border-t border-white/20 bg-marketplace-soft p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:p-8">
            <div className="flex min-h-64 flex-col justify-between rounded-card bg-white p-7 shadow-[0_16px_40px_rgb(116_42_25/0.12)] sm:p-9">
              <div className="flex items-center justify-between gap-5">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-marketplace-strong">
                  Avaliação pública
                </span>
                <Star aria-hidden="true" size={31} weight="fill" className="text-marketplace" />
              </div>
              <div className="mt-10" aria-label={`Avaliação ${shopeeStore.rating} de 5 na Shopee`}>
                <div className="flex items-end gap-4">
                  <p className="text-6xl font-black tracking-[-0.06em] tabular-nums text-foreground sm:text-7xl">
                    {shopeeStore.rating}
                  </p>
                  <div className="mb-2 flex gap-0.5 text-marketplace" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={17} weight="fill" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-muted">de 5 na Shopee</p>
              </div>
            </div>

            <div className="flex min-h-56 flex-col justify-between rounded-card border border-marketplace/15 bg-white p-7 shadow-[0_16px_40px_rgb(116_42_25/0.09)] sm:p-9">
              <ShoppingBagOpen aria-hidden="true" size={34} weight="duotone" className="text-marketplace" />
              <div className="mt-9">
                <p className="text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
                  {shopeeStore.salesLabel}
                </p>
                <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-muted">
                  Histórico informado pela Leal Brinde em sua presença oficial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
