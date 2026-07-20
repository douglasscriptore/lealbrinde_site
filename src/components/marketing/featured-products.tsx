import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { StandardProductSummary } from "@/domain";
import { ProductCard } from "@/components/commerce";
import { Reveal } from "./reveal";

export function FeaturedProducts({ products }: { products: StandardProductSummary[] }) {
  if (!products.length) return null;
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Produtos prontos para personalizar</h2>
          <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted">Escolha as opções, veja o preço real e compre sem sair do site.</p>
        </Reveal>
        <div className="mt-12 grid gap-x-6 gap-y-10 lg:grid-cols-12">
          {products.slice(0, 3).map((product, index) => (
            <Reveal key={product.product.id} delay={Math.min(index * 0.05, 0.15)} className={index === 0 ? "lg:col-span-7 lg:row-span-2" : "lg:col-span-5"}>
              <ProductCard summary={product} featured={index === 0} />
            </Reveal>
          ))}
        </div>
        <Link href="/produtos" className="mt-9 inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 active:translate-y-px">
          Ver catálogo completo <ArrowRight aria-hidden size={19} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
