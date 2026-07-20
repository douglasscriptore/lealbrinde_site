import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/commerce";
import { Reveal } from "@/components/marketing";
import { getCatalog } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Brindes personalizados",
  description: "Brindes personalizados para empresas, eventos, equipes e ações de relacionamento.",
  alternates: { canonical: "/brindes" },
};
export const dynamic = "force-dynamic";

export default function GiftsPage() {
  const { products } = getCatalog({ categoria: "brindes" });
  return (
    <main id="conteudo">
      <section className="bg-[radial-gradient(circle_at_82%_12%,var(--accent-soft),transparent_30%),var(--background)] py-16 sm:py-24">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="text-sm font-bold text-accent">Brindes personalizados</p>
            <h1 className="mt-5 max-w-[13ch] text-balance text-5xl font-black leading-[0.95] tracking-[-0.055em] text-foreground sm:text-7xl">Sua marca presente no dia a dia.</h1>
            <p className="mt-6 max-w-[58ch] text-base leading-7 text-muted sm:text-lg">Produtos para empresas, eventos e equipes, com preço e opções administrados diretamente pela Leal Brinde.</p>
            <Link href="/produtos" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-bold text-accent-foreground">Explorar todo o catálogo</Link>
          </Reveal>
        </div>
      </section>
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight">Brindes disponíveis</h2>
          {products.length ? <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">{products.map((product) => <ProductCard key={product.product.id} summary={product} />)}</div> : <div className="mt-9 rounded-card border border-dashed border-border bg-surface-strong p-8"><h3 className="text-xl font-black">Primeiros produtos em preparação</h3><p className="mt-2 text-sm leading-6 text-muted">O catálogo será liberado quando as opções, imagens e preços reais forem publicados pelo painel.</p></div>}
        </div>
      </section>
    </main>
  );
}
