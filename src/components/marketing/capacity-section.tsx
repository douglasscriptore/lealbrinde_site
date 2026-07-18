import { Factory, Gauge, Timer } from "@phosphor-icons/react/dist/ssr";

import { AnimatedMetric } from "@/components/motion";

import { Reveal } from "./reveal";
import type { EquipmentCapacity } from "./types";

type CapacitySectionProps = {
  title: string;
  description: string;
  equipment: EquipmentCapacity[];
  productionNote: string;
};

export function CapacitySection({
  title,
  description,
  equipment,
  productionNote,
}: CapacitySectionProps) {
  const totalCapacity = equipment.reduce(
    (total, item) => total + item.quantity * item.metersPerHour,
    0,
  );

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="flex min-h-[420px] flex-col justify-between overflow-hidden rounded-card bg-[linear-gradient(145deg,var(--accent),var(--accent-strong))] p-7 text-accent-foreground shadow-premium sm:p-10 lg:col-span-7">
            <Factory aria-hidden="true" size={42} weight="duotone" />
            <div className="mt-16">
              <AnimatedMetric
                value={totalCapacity}
                className="block text-[clamp(5.5rem,13vw,11rem)] font-black leading-[0.74] tracking-[-0.08em] tabular-nums"
              />
              <p className="mt-8 max-w-xl text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
                metros por hora de capacidade nominal
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 lg:col-span-5">
            <Reveal delay={0.06} className="rounded-card border border-border bg-surface p-7 shadow-premium sm:p-8">
              <Gauge aria-hidden="true" size={34} weight="duotone" className="text-accent" />
              <h2 className="mt-8 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
              <dl className="mt-8 grid gap-4">
                {equipment.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-5">
                    <dt className="text-sm text-muted">
                      {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"} de {item.name}
                    </dt>
                    <dd className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {item.metersPerHour} m/h cada
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={0.1} className="rounded-card border border-border bg-surface-strong p-7 shadow-premium sm:p-8">
              <Timer aria-hidden="true" size={32} weight="duotone" className="text-accent" />
              <p className="mt-5 text-base font-semibold leading-relaxed text-foreground">
                {productionNote}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
