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
    <section className="bg-[var(--background)]">
      <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1400px] items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.86fr_1.14fr] md:py-14 lg:gap-14 lg:px-8 lg:py-16">
        <Reveal className="relative z-10 max-w-2xl py-2 md:py-8">
          {eyebrow ? (
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance text-[clamp(3rem,7vw,7.5rem)] font-black leading-[0.88] tracking-[-0.065em] text-[var(--foreground)]">
            {title}
            <span className="block text-[var(--accent)]">{emphasis}</span>
          </h1>
          <p className="mt-7 max-w-[55ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {summary}
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            <MarketingLink {...primaryAction} />
            <MarketingLink {...secondaryAction} variant="secondary" />
          </div>
        </Reveal>

        <Reveal delay={0.08} className="relative min-h-[420px] self-stretch md:min-h-[620px]">
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-[var(--surface-strong)]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              preload={image.priority ?? true}
              loading="eager"
              sizes={image.sizes ?? "(max-width: 767px) 100vw, 58vw"}
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--foreground)_32%,transparent)] via-transparent to-transparent"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-4 -left-4 h-28 w-28 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] backdrop-blur-md sm:-left-6 sm:h-36 sm:w-36"
          />
        </Reveal>
      </div>
    </section>
  );
}
