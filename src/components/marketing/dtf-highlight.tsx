import { FileArrowUp, QrCode, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { MarketingLink } from "./marketing-link";
import { PriceTable } from "./price-table";
import { Reveal } from "./reveal";
import type { MarketingAction, PriceTier } from "./types";

type DtfHighlightProps = {
  title: string;
  description: string;
  tiers: PriceTier[];
  action: MarketingAction;
};

const safeguards = [
  { icon: FileArrowUp, label: "Arquivo ligado ao pedido" },
  { icon: QrCode, label: "Pagamento somente via Pix" },
  { icon: ShieldCheck, label: "Revisão técnica humana" },
];

export function DtfHighlight({ title, description, tiers, action }: DtfHighlightProps) {
  return (
    <section className="bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-8">
        <Reveal>
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {description}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {safeguards.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
                <Icon aria-hidden="true" size={23} weight="duotone" className="shrink-0 text-[var(--accent)]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-9">
            <MarketingLink {...action} />
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <PriceTable tiers={tiers} />
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
            A faixa atingida define o valor de todos os metros do pedido. O total é confirmado antes da geração do Pix.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
