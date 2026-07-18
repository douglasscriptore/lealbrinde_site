import type { DtfProductConfiguration, PriceTable, PriceTier } from "./types";

export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_QUANTITY"
      | "INVALID_INCREMENT"
      | "NO_MATCHING_TIER"
      | "INVALID_PRICE_TABLE",
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export type PriceOpportunity = {
  meters: number;
  totalCents: number;
  savingsCents: number;
};

export type PriceQuote = {
  quantityMeters: number;
  unitPriceCents: number;
  subtotalCents: number;
  priceTableId: string;
  priceTableVersion: number;
  tier: PriceTier;
  opportunity: PriceOpportunity | null;
};

export function validatePriceTiers(
  tiers: PriceTier[],
  minimumMeters = 1,
): string[] {
  const errors: string[] = [];
  const sorted = [...tiers].sort(
    (left, right) => left.minimumMeters - right.minimumMeters,
  );

  if (sorted.length === 0) {
    return ["A tabela precisa ter ao menos uma faixa de preço."];
  }

  if (sorted[0].minimumMeters !== minimumMeters) {
    errors.push("A primeira faixa deve começar na quantidade mínima do produto.");
  }

  sorted.forEach((tier, index) => {
    if (!Number.isInteger(tier.minimumMeters) || tier.minimumMeters < 1) {
      errors.push(`A faixa ${index + 1} possui quantidade mínima inválida.`);
    }

    if (!Number.isInteger(tier.unitPriceCents) || tier.unitPriceCents <= 0) {
      errors.push(`A faixa ${index + 1} possui preço inválido.`);
    }

    if (
      tier.maximumExclusiveMeters !== null &&
      (!Number.isInteger(tier.maximumExclusiveMeters) ||
        tier.maximumExclusiveMeters <= tier.minimumMeters)
    ) {
      errors.push(`A faixa ${index + 1} possui limite final inválido.`);
    }

    const next = sorted[index + 1];
    if (next && tier.maximumExclusiveMeters !== next.minimumMeters) {
      errors.push(`Existe um intervalo ou sobreposição após a faixa ${index + 1}.`);
    }

    if (!next && tier.maximumExclusiveMeters !== null) {
      errors.push("A última faixa deve ser aberta, sem limite máximo.");
    }
  });

  return errors;
}

export function findPriceTier(tiers: PriceTier[], meters: number): PriceTier | null {
  return (
    [...tiers]
      .sort((left, right) => left.minimumMeters - right.minimumMeters)
      .find(
        (tier) =>
          meters >= tier.minimumMeters &&
          (tier.maximumExclusiveMeters === null ||
            meters < tier.maximumExclusiveMeters),
      ) ?? null
  );
}

export function calculateVolumeTotalPrice(
  meters: number,
  configuration: Pick<
    DtfProductConfiguration,
    "minimumMeters" | "meterIncrement" | "pricingMode"
  >,
  priceTable: PriceTable,
): PriceQuote {
  if (!Number.isInteger(meters) || meters < configuration.minimumMeters) {
    throw new PricingError(
      `Informe uma quantidade inteira a partir de ${configuration.minimumMeters} metro(s).`,
      "INVALID_QUANTITY",
    );
  }

  if (
    (meters - configuration.minimumMeters) % configuration.meterIncrement !==
    0
  ) {
    throw new PricingError(
      `A quantidade deve avançar de ${configuration.meterIncrement} em ${configuration.meterIncrement} metro(s).`,
      "INVALID_INCREMENT",
    );
  }

  if (configuration.pricingMode !== "VOLUME_TOTAL") {
    throw new PricingError("A modalidade de preço não é suportada.", "INVALID_PRICE_TABLE");
  }

  const tableErrors = validatePriceTiers(
    priceTable.tiers,
    configuration.minimumMeters,
  );
  if (tableErrors.length > 0) {
    throw new PricingError(tableErrors.join(" "), "INVALID_PRICE_TABLE");
  }

  const tier = findPriceTier(priceTable.tiers, meters);
  if (!tier) {
    throw new PricingError(
      "Nenhuma faixa de preço atende a quantidade informada.",
      "NO_MATCHING_TIER",
    );
  }

  const subtotalCents = meters * tier.unitPriceCents;
  const opportunity = findCheaperFutureTier(
    meters,
    subtotalCents,
    priceTable.tiers,
  );

  return {
    quantityMeters: meters,
    unitPriceCents: tier.unitPriceCents,
    subtotalCents,
    priceTableId: priceTable.id,
    priceTableVersion: priceTable.version,
    tier,
    opportunity,
  };
}

export function findCheaperFutureTier(
  currentMeters: number,
  currentTotalCents: number,
  tiers: PriceTier[],
): PriceOpportunity | null {
  const opportunities = tiers
    .filter((tier) => tier.minimumMeters > currentMeters)
    .map((tier) => ({
      meters: tier.minimumMeters,
      totalCents: tier.minimumMeters * tier.unitPriceCents,
    }))
    .filter((candidate) => candidate.totalCents < currentTotalCents)
    .sort((left, right) => left.meters - right.meters);

  const best = opportunities[0];
  if (!best) {
    return null;
  }

  return {
    ...best,
    savingsCents: currentTotalCents - best.totalCents,
  };
}

export function calculateNominalCapacity(
  equipment: Array<{
    quantity: number;
    unitCapacityMetersPerHour: number;
    active: boolean;
  }>,
): number {
  return equipment
    .filter((item) => item.active)
    .reduce(
      (total, item) =>
        total + item.quantity * item.unitCapacityMetersPerHour,
      0,
    );
}
