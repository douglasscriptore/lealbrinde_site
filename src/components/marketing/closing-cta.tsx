import { MarketingLink } from "./marketing-link";
import { Reveal } from "./reveal";
import type { MarketingAction } from "./types";

type ClosingCtaProps = {
  title: string;
  description: string;
  primaryAction: MarketingAction;
  secondaryAction?: MarketingAction;
};

export function ClosingCta({
  title,
  description,
  primaryAction,
  secondaryAction,
}: ClosingCtaProps) {
  return (
    <section className="bg-[var(--background)] px-4 pb-20 pt-8 sm:px-6 sm:pb-28 lg:px-8">
      <Reveal className="mx-auto max-w-[1400px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface))] px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
        <h2 className="max-w-5xl text-balance text-4xl font-black tracking-[-0.05em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
          {title}
        </h2>
        <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          {description}
        </p>
        <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
          <MarketingLink {...primaryAction} />
          {secondaryAction ? <MarketingLink {...secondaryAction} variant="secondary" /> : null}
        </div>
      </Reveal>
    </section>
  );
}
