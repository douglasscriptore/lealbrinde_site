import type { PriceTier } from "./types";

export const brlCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(valueInCents: number) {
  return brlCurrencyFormatter.format(valueInCents / 100);
}

export function formatTierRange(tier: PriceTier) {
  if (tier.label) {
    return tier.label;
  }

  if (tier.maximumMeters === null) {
    return `${tier.minimumMeters} m ou mais`;
  }

  return `${tier.minimumMeters} a ${tier.maximumMeters} m`;
}

export function findPriceTier(tiers: PriceTier[], meters: number) {
  return tiers.find(
    (tier) =>
      meters >= tier.minimumMeters &&
      (tier.maximumMeters === null || meters <= tier.maximumMeters),
  );
}

export function calculateDtfPrice(tiers: PriceTier[], meters: number) {
  const tier = findPriceTier(tiers, meters);

  if (!tier) {
    return null;
  }

  return {
    tier,
    unitPriceCents: tier.unitPriceCents,
    subtotalCents: meters * tier.unitPriceCents,
  };
}

export function findCheaperNextTier(tiers: PriceTier[], meters: number) {
  const current = calculateDtfPrice(tiers, meters);

  if (!current) {
    return null;
  }

  const candidates = tiers
    .filter((tier) => tier.minimumMeters > meters)
    .map((tier) => ({
      meters: tier.minimumMeters,
      tier,
      subtotalCents: tier.minimumMeters * tier.unitPriceCents,
    }))
    .filter((candidate) => candidate.subtotalCents < current.subtotalCents)
    .sort((first, second) => first.meters - second.meters);

  return candidates[0] ?? null;
}
