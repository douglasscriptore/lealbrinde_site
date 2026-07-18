import Image from "next/image";

import { MarketingLink } from "./marketing-link";
import { Reveal } from "./reveal";
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
  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,color-mix(in_srgb,var(--accent)_9%,transparent),transparent_32%),radial-gradient(circle_at_78%_86%,color-mix(in_srgb,var(--chrome)_18%,transparent),transparent_30%)]"
      />
      <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1400px] items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.86fr_1.14fr] md:py-14 lg:gap-14 lg:px-8 lg:py-16">
        <div className="relative z-10 max-w-2xl py-2 md:py-8">
          <Reveal>
            {eyebrow ? (
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-balance text-[clamp(3rem,6.2vw,6.75rem)] font-black leading-[0.9] tracking-[-0.065em] text-foreground">
              {title}
              <span className="block text-accent">{emphasis}</span>
            </h1>
            <p className="mt-7 max-w-[55ch] text-base leading-relaxed text-muted sm:text-lg">
              {summary}
            </p>
          </Reveal>
          <Reveal delay={0.08} amount={0.1}>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <MarketingLink {...primaryAction} />
              <MarketingLink {...secondaryAction} variant="secondary" />
            </div>
          </Reveal>
        </div>

        <Reveal
          variant="scale"
          delay={0.12}
          className="relative min-h-[420px] self-stretch md:min-h-[620px]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-card border border-white/80 bg-surface-strong shadow-premium">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              preload={image.priority ?? true}
              loading="eager"
              sizes={image.sizes ?? "(max-width: 767px) 100vw, 58vw"}
              className="object-cover saturate-[0.96] contrast-[1.02]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--foreground)_32%,transparent)] via-transparent to-transparent"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
