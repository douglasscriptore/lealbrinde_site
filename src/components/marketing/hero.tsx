import { CheckCircle, Factory, Package } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

import { MarketingLink } from "./marketing-link";
import type { MarketingAction, MarketingImage } from "./types";

export type MarketingHeroProps = {
  eyebrow?: string;
  title: string;
  emphasis: string;
  summary: string;
  primaryAction: MarketingAction;
  secondaryAction: MarketingAction;
  image: MarketingImage;
};

export function MarketingHero({
  eyebrow,
  title,
  emphasis,
  summary,
  primaryAction,
  secondaryAction,
  image,
}: MarketingHeroProps) {
  const assurances = [
    { icon: Factory, title: "Produção própria", text: "Controle do arquivo à entrega" },
    { icon: CheckCircle, title: "Preço confirmado", text: "Total calculado antes do pagamento" },
    { icon: Package, title: "Pedido acompanhado", text: "Status e documentos na sua conta" },
  ];

  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_18%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_27%),linear-gradient(115deg,transparent_0_62%,var(--surface-strong)_62%_100%)]"
      />
      <div className="mx-auto grid min-h-[calc(100dvh-82px)] max-w-shell items-center gap-8 px-4 pb-8 pt-8 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(32rem,1.18fr)] lg:gap-12 lg:px-8 lg:pb-10 lg:pt-10">
        <div className="relative z-10 max-w-2xl py-3 motion-safe:animate-hero-copy lg:py-8">
          <div>
            {eyebrow ? (
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-[11ch] text-balance text-[clamp(3rem,5.6vw,5.8rem)] font-black leading-[0.93] tracking-[-0.06em] text-foreground">
              {title}
              <span className="block text-accent">{emphasis}</span>
            </h1>
            <p className="mt-6 max-w-[47ch] text-base leading-7 text-muted sm:text-lg">
              {summary}
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <MarketingLink {...primaryAction} />
              <MarketingLink {...secondaryAction} variant="secondary" />
            </div>
          </div>
        </div>

        <div className="relative min-h-[390px] self-stretch motion-safe:animate-hero-media sm:min-h-[500px] lg:min-h-[610px]">
          <div className="absolute inset-0 overflow-hidden rounded-[1.4rem] border border-white bg-surface-strong shadow-float">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              preload={image.priority ?? true}
              loading="eager"
              sizes={image.sizes ?? "(max-width: 767px) 100vw, 58vw"}
              className="object-cover object-center saturate-[0.94] contrast-[1.025]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(115deg,color-mix(in_srgb,var(--foreground)_7%,transparent),transparent_35%)]"
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-shell px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12">
        <div className="grid overflow-hidden rounded-card border border-border bg-white/92 shadow-premium backdrop-blur-sm md:grid-cols-3">
          {assurances.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4 border-b border-border px-5 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:px-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
                <Icon aria-hidden size={22} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
