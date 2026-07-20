import { FileArrowUp, QrCode, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { DtfCalculator } from "./dtf-calculator";
import { Reveal } from "./reveal";
import type { PriceTier } from "./types";

type DtfHighlightProps = {
  title: string;
  description: string;
  tiers: PriceTier[];
  minimumMeters: number;
  meterIncrement: number;
  orderHref: string;
};

const safeguards = [
  { icon: FileArrowUp, label: "Arquivo ligado ao pedido" },
  { icon: QrCode, label: "Pagamento somente via Pix" },
  { icon: ShieldCheck, label: "Revisão técnica humana" },
];

export function DtfHighlight({
  title,
  description,
  tiers,
  minimumMeters,
  meterIncrement,
  orderHref,
}: DtfHighlightProps) {
  return (
    <section id="calcular-dtf" className="scroll-mt-24 bg-[linear-gradient(180deg,var(--surface),var(--surface-strong),var(--surface))] py-20 sm:py-28">
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-accent">DTF por metro</p>
            <h2 className="mt-4 max-w-[12ch] text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
              {title}
            </h2>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem] lg:grid-cols-1 xl:grid-cols-3">
            {safeguards.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-control border border-border/80 bg-white/75 px-4 py-3 text-sm font-semibold text-foreground shadow-[0_8px_24px_rgb(28_78_96/0.06)]">
                <Icon aria-hidden="true" size={23} weight="duotone" className="shrink-0 text-accent" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-10 sm:mt-14">
          <DtfCalculator
            tiers={tiers}
            minimumMeters={minimumMeters}
            meterIncrement={meterIncrement}
            orderHref={orderHref}
            orderActionLabel="Continuar pedido de DTF"
          />
        </Reveal>
      </div>
    </section>
  );
}
