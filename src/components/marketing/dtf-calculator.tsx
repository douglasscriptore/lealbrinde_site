"use client";

import { Check, Info, Minus, Plus, Warning } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  calculateDtfPrice,
  findCheaperNextTier,
  formatCents,
  formatTierRange,
} from "./pricing";
import type { PriceTier } from "./types";

type DtfCalculatorProps = {
  tiers: PriceTier[];
  minimumMeters: number;
  meterIncrement: number;
  initialMeters?: number;
  orderHref: string;
  orderActionLabel?: string;
};

type AnimatedValueProps = {
  value: string;
  className?: string;
  align?: "left" | "right";
  reducedMotion: boolean;
};

function AnimatedValue({
  value,
  className = "",
  align = "left",
  reducedMotion,
}: AnimatedValueProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid overflow-hidden align-bottom ${
        align === "right" ? "justify-items-end" : "justify-items-start"
      } ${className}`}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={value}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function buildOrderHref(baseHref: string, meters: number) {
  const separator = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separator}meters=${encodeURIComponent(String(meters))}`;
}

export function DtfCalculator({
  tiers,
  minimumMeters,
  meterIncrement,
  initialMeters = minimumMeters,
  orderHref,
  orderActionLabel = "Continuar pedido",
}: DtfCalculatorProps) {
  const shouldReduceMotion = useReducedMotion();
  const [metersInput, setMetersInput] = useState(String(initialMeters));
  const meters = Number(metersInput);
  const isInteger = Number.isInteger(meters);
  const respectsIncrement =
    isInteger && meters >= minimumMeters && (meters - minimumMeters) % meterIncrement === 0;
  const price = useMemo(
    () => (respectsIncrement ? calculateDtfPrice(tiers, meters) : null),
    [meters, respectsIncrement, tiers],
  );
  const opportunity = useMemo(
    () => (respectsIncrement ? findCheaperNextTier(tiers, meters) : null),
    [meters, respectsIncrement, tiers],
  );

  const errorMessage = !metersInput
    ? "Informe a quantidade de metros."
    : !isInteger
      ? "A quantidade deve ser informada em metros inteiros."
      : meters < minimumMeters
        ? `O pedido mínimo é de ${minimumMeters} m.`
        : !respectsIncrement
          ? `Use incrementos de ${meterIncrement} m.`
          : !price
            ? "Não encontramos uma faixa de preço para essa quantidade."
            : null;

  function changeBy(amount: number) {
    const current = Number.isInteger(meters) ? meters : minimumMeters;
    setMetersInput(String(Math.max(minimumMeters, current + amount)));
  }

  return (
    <div className="grid overflow-hidden rounded-card border border-border bg-surface shadow-premium lg:grid-cols-[0.92fr_1.08fr]">
      <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
        <label htmlFor="dtf-meters" className="text-base font-bold text-foreground">
          Quantos metros você precisa?
        </label>
        <p id="dtf-meters-help" className="mt-2 text-sm leading-relaxed text-muted">
          Informe metros inteiros. A faixa atingida vale para toda a quantidade.
        </p>

        <div className="mt-6 flex max-w-sm items-center gap-2">
          <button
            type="button"
            onClick={() => changeBy(-meterIncrement)}
            disabled={meters <= minimumMeters}
            aria-label={`Diminuir ${meterIncrement} metro`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-accent hover:shadow-premium disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px active:scale-[0.96]"
          >
            <Minus aria-hidden="true" size={18} weight="bold" />
          </button>
          <div className="relative min-w-0 flex-1">
            <input
              id="dtf-meters"
              type="number"
              inputMode="numeric"
              min={minimumMeters}
              step={meterIncrement}
              value={metersInput}
              onChange={(event) => setMetersInput(event.target.value)}
              aria-describedby={`dtf-meters-help${errorMessage ? " dtf-meters-error" : ""}`}
              aria-invalid={Boolean(errorMessage)}
              className="h-14 w-full rounded-control border border-border bg-background px-4 pr-20 text-xl font-bold tabular-nums text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-muted">
              metros
            </span>
          </div>
          <button
            type="button"
            onClick={() => changeBy(meterIncrement)}
            aria-label={`Aumentar ${meterIncrement} metro`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-accent hover:shadow-premium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px active:scale-[0.96]"
          >
            <Plus aria-hidden="true" size={18} weight="bold" />
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {errorMessage ? (
            <p id="dtf-meters-error" className="mt-4 flex items-start gap-2 text-sm font-semibold text-danger">
              <Warning aria-hidden="true" size={18} weight="fill" className="mt-0.5 shrink-0" />
              {errorMessage}
            </p>
          ) : null}

          <AnimatePresence initial={false}>
            {opportunity ? (
              <motion.div
                key={opportunity.meters}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                className="mt-5 rounded-card border border-accent/35 bg-accent-soft/45 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]"
              >
                <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-foreground">
                  <Info aria-hidden="true" size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                  <span>
                    {opportunity.meters} metros custam {formatCents(opportunity.subtotalCents)} com a faixa de grande volume.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setMetersInput(String(opportunity.meters))}
                  className="mt-4 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-accent px-4 text-sm font-bold text-accent transition-[transform,color,background-color] hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px active:scale-[0.98]"
                >
                  Alterar para {opportunity.meters} metros
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-[linear-gradient(145deg,var(--surface),var(--surface-strong))] p-6 sm:p-8 lg:p-10">
        <div>
          <p className="text-sm font-semibold text-muted">Resumo do cálculo</p>
          <AnimatePresence initial={false} mode="wait">
            {price ? (
              <motion.div
                key="price-summary"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                className="mt-5"
              >
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                  {meters} {meters === 1 ? "metro" : "metros"}. Faixa aplicada: {formatTierRange(price.tier)}. Valor por metro: {formatCents(price.unitPriceCents)}. Subtotal: {formatCents(price.subtotalCents)}.
                </p>
                <div className="flex items-end justify-between gap-6 border-b border-border pb-5">
                  <div>
                    <p className="text-sm text-muted">Faixa aplicada</p>
                    <AnimatedValue
                      value={formatTierRange(price.tier)}
                      reducedMotion={Boolean(shouldReduceMotion)}
                      className="mt-1 font-bold text-foreground"
                    />
                  </div>
                  <p className="text-right text-sm font-bold tabular-nums text-foreground">
                    <AnimatedValue
                      value={formatCents(price.unitPriceCents)}
                      reducedMotion={Boolean(shouldReduceMotion)}
                      align="right"
                    />{" "}
                    <span aria-hidden="true">por metro</span>
                  </p>
                </div>
                <div className="flex items-end justify-between gap-6 pt-6">
                  <p className="text-sm font-semibold text-muted">Subtotal</p>
                  <AnimatedValue
                    value={formatCents(price.subtotalCents)}
                    reducedMotion={Boolean(shouldReduceMotion)}
                    align="right"
                    className="text-4xl font-black tracking-[-0.045em] tabular-nums text-foreground sm:text-5xl"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="invalid-price"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5 text-sm leading-relaxed text-muted"
              >
                Corrija a quantidade para visualizar o total.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-9">
          {price ? (
            <Link
              href={buildOrderHref(orderHref, meters)}
              className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground shadow-premium transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-accent-strong hover:shadow-premium-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px active:scale-[0.98]"
            >
              {orderActionLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full bg-surface-strong px-5 text-sm font-bold text-muted"
            >
              {orderActionLabel}
            </button>
          )}
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Check aria-hidden="true" size={15} weight="bold" className="mt-0.5 shrink-0 text-accent" />
            O servidor confirma quantidade, faixa e total antes de gerar o Pix.
          </p>
        </div>
      </div>
    </div>
  );
}
