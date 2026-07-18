import { Plus } from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "./reveal";
import type { FrequentlyAskedQuestion } from "./types";

type FaqSectionProps = {
  title: string;
  description?: string;
  questions: FrequentlyAskedQuestion[];
};

export function FaqSection({ title, description, questions }: FaqSectionProps) {
  return (
    <section className="bg-[var(--background)] py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8">
        <Reveal>
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </Reveal>

        <Reveal delay={0.06} className="border-t border-[var(--border)]">
          {questions.map((item) => (
            <details key={item.question} className="group border-b border-[var(--border)]">
              <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg font-bold tracking-[-0.015em] text-[var(--foreground)] outline-none transition-colors hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--accent)]">
                  <Plus
                    aria-hidden="true"
                    size={17}
                    weight="bold"
                    className="transition-transform duration-200 motion-reduce:transition-none group-open:rotate-45"
                  />
                </span>
              </summary>
              <p className="max-w-[68ch] pb-7 pr-12 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
