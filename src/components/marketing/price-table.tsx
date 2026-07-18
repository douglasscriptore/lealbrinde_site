import { Check } from "@phosphor-icons/react/dist/ssr";

import { formatCents, formatTierRange } from "./pricing";
import type { PriceTier } from "./types";

type PriceTableProps = {
  tiers: PriceTier[];
  activeTierId?: string;
  compact?: boolean;
  caption?: string;
};

export function PriceTable({
  tiers,
  activeTierId,
  compact = false,
  caption = "Preço por faixa de metragem",
}: PriceTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-[var(--surface-strong)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            <th scope="col" className={compact ? "px-4 py-3" : "px-5 py-4"}>
              Quantidade
            </th>
            <th scope="col" className={`${compact ? "px-4 py-3" : "px-5 py-4"} text-right`}>
              Valor por metro
            </th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => {
            const isActive = tier.id === activeTierId;

            return (
              <tr
                key={tier.id}
                className={`border-t border-[var(--border)] transition-colors ${
                  isActive ? "bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]" : ""
                }`}
              >
                <th
                  scope="row"
                  className={`${compact ? "px-4 py-3" : "px-5 py-4"} text-sm font-medium text-[var(--foreground)]`}
                >
                  <span className="inline-flex items-center gap-2">
                    {isActive ? (
                      <Check aria-hidden="true" size={16} weight="bold" className="text-[var(--accent)]" />
                    ) : null}
                    {formatTierRange(tier)}
                  </span>
                </th>
                <td
                  className={`${compact ? "px-4 py-3" : "px-5 py-4"} text-right text-sm font-bold tabular-nums text-[var(--foreground)]`}
                >
                  {formatCents(tier.unitPriceCents)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
