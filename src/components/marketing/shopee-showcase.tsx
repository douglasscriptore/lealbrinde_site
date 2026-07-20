import { ArrowSquareOut, Star } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import { shopeeStore } from "@/lib/marketplace";

import { Reveal } from "./reveal";

export function ShopeeShowcase() {
  return (
    <section className="bg-background px-4 pb-20 pt-4 sm:px-6 sm:pb-28 lg:px-8">
      <Reveal className="mx-auto w-full max-w-[400px]" variant="scale">
        <Link
          aria-label={`Visitar a loja oficial Leal Brinde na Shopee. Avaliação ${shopeeStore.rating} de 5 e ${shopeeStore.salesLabel}.`}
          className="group relative block overflow-hidden rounded-card bg-marketplace-strong p-6 text-white shadow-[0_24px_60px_rgb(238_77_45/0.24)] transition-[transform,box-shadow] duration-(--duration-normal) ease-premium hover:-translate-y-1 hover:shadow-[0_30px_70px_rgb(238_77_45/0.31)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marketplace active:translate-y-px active:scale-[0.99] sm:p-7"
          href={shopeeStore.url}
          rel="noreferrer"
          target="_blank"
        >
          <div className="absolute -right-14 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

          <div className="relative flex items-start justify-between gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-white shadow-[0_10px_30px_rgb(123_33_16/0.2)]">
              <Image alt="" aria-hidden height={34} src="/images/shopee-brand.svg" width={34} />
            </div>
            <ArrowSquareOut
              aria-hidden="true"
              className="mt-1 transition-transform duration-(--duration-fast) ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              size={22}
              weight="bold"
            />
          </div>

          <div className="relative mt-8">
            <p className="text-sm font-bold text-white/90">Loja oficial na Shopee</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Compre também pela Shopee
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/90">
              Veja nosso catálogo completo com as condições de pagamento e entrega da plataforma.
            </p>
          </div>

          <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-white/20 pt-5">
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-2xl font-black tabular-nums">{shopeeStore.rating}</strong>
                <Star aria-hidden="true" className="text-white" size={18} weight="fill" />
              </div>
              <p className="mt-1 text-xs font-semibold text-white/80">de 5 na Shopee</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <strong className="text-lg font-black leading-tight">{shopeeStore.salesLabel}</strong>
              <p className="mt-1 text-xs font-semibold text-white/80">na loja oficial</p>
            </div>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}
