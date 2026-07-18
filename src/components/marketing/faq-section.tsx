"use client";

import { Plus } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Reveal } from "./reveal";
import type { FrequentlyAskedQuestion } from "./types";

type FaqSectionProps = {
  title: string;
  description?: string;
  questions: FrequentlyAskedQuestion[];
};

export function FaqSection({ title, description, questions }: FaqSectionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(() => new Set());
  const shouldReduceMotion = useReducedMotion();

  function toggleItem(index: number) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8">
        <Reveal>
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </Reveal>

        <Reveal delay={0.06} className="overflow-hidden rounded-card border border-border bg-white shadow-premium">
          {questions.map((item, index) => {
            const isOpen = openItems.has(index);
            const panelId = `faq-panel-${index}`;

            return (
              <div key={item.question} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => toggleItem(index)}
                  className="group flex min-h-20 w-full items-center justify-between gap-6 px-5 py-5 text-left text-lg font-bold tracking-[-0.015em] text-foreground transition-colors hover:bg-surface-strong/70 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-7"
                >
                  <span>{item.question}</span>
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-accent"
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                  >
                    <Plus size={17} weight="bold" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      className="px-5 pb-7 pr-12 text-sm leading-relaxed text-muted sm:px-7 sm:pr-16 sm:text-base"
                    >
                      {item.answer}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
