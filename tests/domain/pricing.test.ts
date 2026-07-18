import { describe, expect, it } from "vitest";

import {
  calculateNominalCapacity,
  calculateVolumeTotalPrice,
  PricingError,
  validatePriceTiers,
  type DtfProductConfiguration,
  type PriceTable,
} from "@/domain";

const configuration: Pick<
  DtfProductConfiguration,
  "minimumMeters" | "meterIncrement" | "pricingMode"
> = {
  minimumMeters: 1,
  meterIncrement: 1,
  pricingMode: "VOLUME_TOTAL",
};

const priceTable: PriceTable = {
  id: "table-v1",
  productId: "product-dtf",
  version: 1,
  status: "PUBLISHED",
  validFrom: null,
  validUntil: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  publishedAt: "2026-07-18T00:00:00.000Z",
  tiers: [
    {
      id: "tier-1",
      priceTableId: "table-v1",
      minimumMeters: 1,
      maximumExclusiveMeters: 6,
      unitPriceCents: 3_990,
      position: 0,
    },
    {
      id: "tier-2",
      priceTableId: "table-v1",
      minimumMeters: 6,
      maximumExclusiveMeters: 11,
      unitPriceCents: 3_490,
      position: 1,
    },
    {
      id: "tier-3",
      priceTableId: "table-v1",
      minimumMeters: 11,
      maximumExclusiveMeters: 100,
      unitPriceCents: 3_190,
      position: 2,
    },
    {
      id: "tier-4",
      priceTableId: "table-v1",
      minimumMeters: 100,
      maximumExclusiveMeters: null,
      unitPriceCents: 2_790,
      position: 3,
    },
  ],
};

describe("cálculo VOLUME_TOTAL", () => {
  it.each([
    [1, 3_990, 3_990],
    [5, 3_990, 19_950],
    [6, 3_490, 20_940],
    [10, 3_490, 34_900],
    [11, 3_190, 35_090],
    [99, 3_190, 315_810],
    [100, 2_790, 279_000],
    [101, 2_790, 281_790],
  ])(
    "calcula %i metro(s) com preço unitário e total exatos",
    (meters, unitPriceCents, subtotalCents) => {
      const quote = calculateVolumeTotalPrice(
        meters,
        configuration,
        priceTable,
      );
      expect(quote.unitPriceCents).toBe(unitPriceCents);
      expect(quote.subtotalCents).toBe(subtotalCents);
    },
  );

  it("expõe com transparência a oportunidade entre 99 e 100 metros", () => {
    const quote = calculateVolumeTotalPrice(99, configuration, priceTable);

    expect(quote.opportunity).toEqual({
      meters: 100,
      totalCents: 279_000,
      savingsCents: 36_810,
    });
  });

  it.each([0, 1.5, -1])("rejeita quantidade inválida: %s", (meters) => {
    expect(() =>
      calculateVolumeTotalPrice(meters, configuration, priceTable),
    ).toThrow(PricingError);
  });

  it("rejeita intervalos entre faixas", () => {
    const invalid = structuredClone(priceTable.tiers);
    invalid[0].maximumExclusiveMeters = 5;
    expect(validatePriceTiers(invalid)).toContain(
      "Existe um intervalo ou sobreposição após a faixa 1.",
    );
  });

  it("calcula capacidade nominal somente com equipamentos ativos", () => {
    expect(
      calculateNominalCapacity([
        { quantity: 2, unitCapacityMetersPerHour: 27, active: true },
        { quantity: 1, unitCapacityMetersPerHour: 11, active: true },
        { quantity: 1, unitCapacityMetersPerHour: 99, active: false },
      ]),
    ).toBe(65);
  });
});
