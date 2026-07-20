import { ArrowRight, MagnifyingGlass, Package } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import type { Category, StandardProductSummary } from "@/domain";
import { Reveal } from "@/components/marketing";
import { ProductCard } from "./product-card";

export function CatalogView({
  products,
  categories,
  query,
}: {
  products: StandardProductSummary[];
  categories: Category[];
  query: Record<string, string | undefined>;
}) {
  return (
    <main id="conteudo">
      <section className="overflow-hidden bg-surface-subtle pb-10 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-7 lg:grid-cols-[0.86fr_1.14fr]">
            <Reveal className="flex flex-col justify-center py-5 lg:py-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Catálogo Leal Brinde</p>
              <h1 className="mt-5 max-w-[12ch] text-balance text-5xl font-black leading-[0.95] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">Produtos feitos para aparecer.</h1>
              <p className="mt-6 max-w-[48ch] text-base leading-7 text-muted sm:text-lg">Escolha, personalize e confira o valor antes de comprar.</p>
              <Link href="/dtf" className="group mt-7 inline-flex w-fit items-center gap-2 text-sm font-black text-accent">Precisa de DTF por metro?<ArrowRight aria-hidden size={17} weight="bold" className="transition-transform group-hover:translate-x-1" /></Link>
            </Reveal>
            <Reveal variant="scale" className="relative min-h-[310px] overflow-hidden rounded-card border border-white bg-surface shadow-float sm:min-h-[410px]">
              <Image src="/images/leal-commerce-hero-v2.png" alt="Produtos personalizados produzidos pela Leal Brinde" fill priority sizes="(max-width: 1023px) 100vw, 58vw" className="object-cover" />
            </Reveal>
          </div>

          <form action="/produtos" className="relative z-10 mt-7 grid gap-3 rounded-card border border-border bg-surface p-4 shadow-premium md:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:-mt-6 lg:mx-8">
            <label className="relative">
              <span className="sr-only">Buscar produtos</span>
              <MagnifyingGlass aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input name="q" defaultValue={query.q} placeholder="Buscar por produto, código ou material" className="min-h-12 w-full rounded-control border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted" />
            </label>
            <select name="categoria" defaultValue={query.categoria ?? ""} aria-label="Categoria" className="min-h-12 rounded-control border border-border bg-background px-4 text-foreground">
              <option value="">Todas as categorias</option>
              {categories.map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}
            </select>
            <button className="min-h-12 whitespace-nowrap rounded-full bg-accent px-6 font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 active:translate-y-px">Buscar produtos</button>
            <div className="flex flex-wrap gap-3 md:col-span-3">
              <select name="ordem" defaultValue={query.ordem ?? "destaques"} aria-label="Ordenação" className="min-h-11 rounded-control border border-border bg-background px-3 text-sm">
                <option value="destaques">Destaques</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
                <option value="recentes">Mais recentes</option>
              </select>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-medium">
                <input type="checkbox" name="disponibilidade" value="disponivel" defaultChecked={query.disponibilidade === "disponivel"} className="size-4 accent-accent" />
                Somente disponíveis
              </label>
            </div>
          </form>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          {products.length ? (
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => <ProductCard key={product.product.id} summary={product} featured={index === 0 && products.length > 3} />)}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-card border border-dashed border-border bg-surface-strong p-8 text-center">
              <div className="max-w-md">
                <Package aria-hidden size={46} weight="duotone" className="mx-auto text-accent" />
                <h2 className="mt-5 text-2xl font-black tracking-tight">O catálogo está sendo preparado</h2>
                <p className="mt-3 text-sm leading-6 text-muted">Os produtos serão publicados pelo painel com opções, preço e disponibilidade reais.</p>
                {(query.q || query.categoria) ? <Link href="/produtos" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-accent px-5 font-bold text-accent">Limpar filtros</Link> : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
