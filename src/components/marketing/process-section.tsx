import {
  Calculator,
  CheckCircle,
  Factory,
  FileArrowUp,
  Package,
  QrCode,
} from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "./reveal";
import type { ProcessStep } from "./types";

const processIcons = {
  calculate: Calculator,
  upload: FileArrowUp,
  pix: QrCode,
  review: CheckCircle,
  production: Factory,
  delivery: Package,
} as const;

type ProcessSectionProps = {
  title: string;
  description: string;
  steps: ProcessStep[];
};

export function ProcessSection({ title, description, steps }: ProcessSectionProps) {
  return (
    <section id="como-funciona" className="bg-[var(--background)] py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {description}
          </p>
        </Reveal>

        <ol className="relative mt-14 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = processIcons[step.icon];

            return (
              <li key={`${step.title}-${index}`} className="relative min-h-48 pl-16">
                <div className="absolute left-0 top-0 flex size-12 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--accent)]">
                  <Icon aria-hidden="true" size={24} weight="duotone" />
                </div>
                <p className="text-sm font-bold tabular-nums text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-2xl font-bold tracking-[-0.025em] text-[var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-[var(--muted)]">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
