import {
  Gift,
  IdentificationCard,
  ShoppingBagOpen,
  TShirt,
  Tag,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { Reveal, ShopeeShowcase } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Brindes personalizados",
  description: "Encontre brindes personalizados para empresas, eventos e ações de relacionamento.",
};

const availableFamilies = [
  { icon: Gift, label: "Brindes personalizados" },
  { icon: Tag, label: "Etiquetas termocolantes" },
  { icon: TShirt, label: "Estampas e camisetas" },
  { icon: IdentificationCard, label: "Crachás personalizados" },
];

export default function GiftsPage() {
  return (
    <main id="conteudo">
      <section className="bg-[radial-gradient(circle_at_80%_14%,var(--marketplace-soft),transparent_25%),radial-gradient(circle_at_12%_84%,var(--surface-strong),transparent_34%),var(--background)] py-16 sm:py-24">
        <div className="mx-auto grid max-w-shell gap-12 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-20 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Brindes personalizados</p>
            <h1 className="mt-6 max-w-[13ch] text-balance text-[clamp(3.6rem,7vw,7.2rem)] font-black leading-[0.89] tracking-[-0.065em] text-foreground">
              Sua marca presente no dia a dia.
            </h1>
            <p className="mt-7 max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
              Produtos para empresas, eventos, equipes e ações de relacionamento. Enquanto o novo catálogo fica pronto, nossa loja oficial na Shopee reúne opções que já podem ser consultadas.
            </p>
          </Reveal>

          <Reveal variant="scale" delay={0.08} className="rounded-card border border-border bg-white p-6 shadow-premium sm:p-8">
            <div className="flex items-center justify-between gap-5">
              <ShoppingBagOpen aria-hidden="true" size={32} weight="duotone" className="text-marketplace" />
              <span className="rounded-full bg-marketplace-soft px-3 py-1 text-xs font-bold text-marketplace">
                Disponíveis na loja
              </span>
            </div>
            <ul className="mt-8 divide-y divide-border">
              {availableFamilies.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <Icon aria-hidden="true" size={21} weight="duotone" className="shrink-0 text-accent" />
                  <span className="font-semibold text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <ShopeeShowcase
        eyebrow="Catálogo atual"
        title="Escolha com confiança em nossa loja oficial"
        description="A Leal Brinde mantém uma vitrine ativa na Shopee com brindes, etiquetas, DTF pronto e outros personalizados. Consulte cada anúncio para conferir personalização, prazo e disponibilidade."
      />
    </main>
  );
}
