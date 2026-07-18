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
    <section className="bg-background px-4 pb-20 pt-8 sm:px-6 sm:pb-28 lg:px-8">
      <Reveal className="relative mx-auto max-w-shell overflow-hidden rounded-card border border-accent/25 bg-[radial-gradient(circle_at_84%_10%,var(--accent-soft),transparent_34%),linear-gradient(145deg,var(--surface),var(--surface-strong))] px-6 py-14 shadow-premium sm:px-10 sm:py-20 lg:px-16">
        <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <h2 className="max-w-5xl text-balance text-4xl font-black tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
          {title}
        </h2>
        <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
        <div className="relative mt-9 flex flex-col items-start gap-3 sm:flex-row">
          <MarketingLink {...primaryAction} />
          {secondaryAction ? <MarketingLink {...secondaryAction} variant="secondary" /> : null}
        </div>
      </Reveal>
    </section>
  );
}
