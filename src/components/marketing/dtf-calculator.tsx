"use client";

import { Check, Info, Minus, Plus, Warning } from "@phosphor-icons/react";
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
    <div className="grid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:grid-cols-[0.92fr_1.08fr]">
      <div className="border-b border-[var(--border)] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
        <label htmlFor="dtf-meters" className="text-base font-bold text-[var(--foreground)]">
          Quantos metros você precisa?
        </label>
        <p id="dtf-meters-help" className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Informe metros inteiros. A faixa atingida vale para toda a quantidade.
        </p>

        <div className="mt-6 flex max-w-sm items-center gap-2">
          <button
            type="button"
            onClick={() => changeBy(-meterIncrement)}
            disabled={meters <= minimumMeters}
            aria-label={`Diminuir ${meterIncrement} metro`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
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
              className="h-14 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 pr-20 text-xl font-bold tabular-nums text-[var(--foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">
              metros
            </span>
          </div>
          <button
            type="button"
            onClick={() => changeBy(meterIncrement)}
            aria-label={`Aumentar ${meterIncrement} metro`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
          >
            <Plus aria-hidden="true" size={18} weight="bold" />
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {errorMessage ? (
            <p id="dtf-meters-error" className="mt-4 flex items-start gap-2 text-sm font-semibold text-[var(--danger)]">
              <Warning aria-hidden="true" size={18} weight="fill" className="mt-0.5 shrink-0" />
              {errorMessage}
            </p>
          ) : null}

          {opportunity ? (
            <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_9%,var(--background))] p-4">
              <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-[var(--foreground)]">
                <Info aria-hidden="true" size={20} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <span>
                  {opportunity.meters} metros custam {formatCents(opportunity.subtotalCents)} com a faixa de grande volume.
                </span>
              </p>
              <button
                type="button"
                onClick={() => setMetersInput(String(opportunity.meters))}
                className="mt-4 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-[var(--accent)] px-4 text-sm font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
              >
                Alterar para {opportunity.meters} metros
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">Resumo do cálculo</p>
          {price ? (
            <div className="mt-5">
              <div className="flex items-end justify-between gap-6 border-b border-[var(--border)] pb-5">
                <div>
                  <p className="text-sm text-[var(--muted)]">Faixa aplicada</p>
                  <p className="mt-1 font-bold text-[var(--foreground)]">
                    {formatTierRange(price.tier)}
                  </p>
                </div>
                <p className="text-right text-sm font-bold tabular-nums text-[var(--foreground)]">
                  {formatCents(price.unitPriceCents)} por metro
                </p>
              </div>
              <div className="flex items-end justify-between gap-6 pt-6">
                <p className="text-sm font-semibold text-[var(--muted)]">Subtotal</p>
                <p className="text-4xl font-black tracking-[-0.045em] tabular-nums text-[var(--foreground)] sm:text-5xl">
                  {formatCents(price.subtotalCents)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
              Corrija a quantidade para visualizar o total.
            </p>
          )}
        </div>

        <div className="mt-9">
          {price ? (
            <Link
              href={buildOrderHref(orderHref, meters)}
              className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)] active:translate-y-px"
            >
              {orderActionLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full bg-[var(--surface-strong)] px-5 text-sm font-bold text-[var(--muted)]"
            >
              {orderActionLabel}
            </button>
          )}
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
            <Check aria-hidden="true" size={15} weight="bold" className="mt-0.5 shrink-0 text-[var(--accent)]" />
            O servidor confirma quantidade, faixa e total antes de gerar o Pix.
          </p>
        </div>
      </div>
    </div>
  );
}
