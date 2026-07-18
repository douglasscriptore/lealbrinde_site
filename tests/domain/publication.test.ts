import { describe, expect, it } from "vitest";

import {
  validateDtfProductForPublication,
  type DtfProductAggregate,
} from "@/domain";

function validAggregate(): DtfProductAggregate {
  return {
    product: {
      id: "product",
      code: "DTF-TEST",
      name: "DTF Teste",
      slug: "/dtf/teste",
      type: "DTF_BY_METER",
      summary: "Resumo",
      description: "Descrição",
      status: "DRAFT",
      featured: true,
      displayOrder: 1,
      paymentMethods: ["PIX"],
      fulfillmentOptions: ["PICKUP"],
      mainImageUrl: "/images/dtf.webp",
      gallery: [
        {
          id: "media-cover",
          url: "/images/dtf.webp",
          alt: "Amostra de impressão DTF",
          position: 0,
        },
      ],
      seo: {
        title: "DTF Teste",
        description: "Descrição de SEO",
        canonicalPath: "/dtf/teste",
        socialImageUrl: null,
      },
      publishedAt: null,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    },
    configuration: {
      productId: "product",
      minimumMeters: 1,
      meterIncrement: 1,
      pricingMode: "VOLUME_TOTAL",
      paymentMethods: ["PIX"],
      printableWidthCm: 57,
      filePolicyId: "file-policy",
      productionPolicyId: "production-policy",
      fulfillmentOptions: ["PICKUP"],
    },
    filePolicy: {
      id: "file-policy",
      name: "Arquivos DTF",
      acceptedExtensions: ["png", "pdf", "tiff"],
      maximumFileSizeMb: 200,
      minimumResolutionDpi: 300,
      requiresTransparentBackground: true,
      colorPolicy: "Perfil informado no guia.",
      preparationGuide: "Guia confirmado.",
      confirmed: true,
    },
    productionPolicy: {
      id: "production-policy",
      startTrigger: "PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED",
      standardStartWithinBusinessHours: 24,
      customLeadTimeAboveMeters: 100,
      largeOrderMode: "MANUAL_CONFIRMATION",
    },
    specifications: [
      {
        id: "spec",
        productId: "product",
        group: "Filme",
        title: "Hot Peel",
        description: "Confirmado",
        position: 1,
        visible: true,
        confirmed: true,
      },
    ],
    equipment: [],
    priceTables: [
      {
        id: "table",
        productId: "product",
        version: 1,
        status: "PUBLISHED",
        validFrom: null,
        validUntil: null,
        createdAt: "2026-07-18T00:00:00.000Z",
        publishedAt: "2026-07-18T00:00:00.000Z",
        tiers: [
          {
            id: "tier-1",
            priceTableId: "table",
            minimumMeters: 1,
            maximumExclusiveMeters: 100,
            unitPriceCents: 3_190,
            position: 0,
          },
          {
            id: "tier-2",
            priceTableId: "table",
            minimumMeters: 100,
            maximumExclusiveMeters: null,
            unitPriceCents: 2_790,
            position: 1,
          },
        ],
      },
    ],
  };
}

describe("checklist de publicação", () => {
  it("permite produto completo e trata a quebra de preço como aviso", () => {
    const checklist = validateDtfProductForPublication(validAggregate());

    expect(checklist.canPublish).toBe(true);
    expect(checklist.errors).toHaveLength(0);
    expect(checklist.warnings.map((issue) => issue.code)).toContain(
      "PRICE_CURVE_BREAK",
    );
  });

  it("bloqueia publicação sem imagem, largura e política confirmada", () => {
    const aggregate = validAggregate();
    aggregate.product.mainImageUrl = null;
    aggregate.configuration.printableWidthCm = null;
    aggregate.filePolicy = { ...aggregate.filePolicy!, confirmed: false };

    const checklist = validateDtfProductForPublication(aggregate);
    expect(checklist.canPublish).toBe(false);
    expect(checklist.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_IMAGE",
        "MISSING_PRINTABLE_WIDTH",
        "UNCONFIRMED_FILE_POLICY",
      ]),
    );
  });

  it("bloqueia alegações técnicas visíveis sem confirmação", () => {
    const aggregate = validAggregate();
    aggregate.specifications[0].confirmed = false;

    const checklist = validateDtfProductForPublication(aggregate);
    expect(checklist.canPublish).toBe(false);
    expect(checklist.errors.map((issue) => issue.code)).toContain(
      "UNCONFIRMED_TECHNICAL_CLAIMS",
    );
  });
});
