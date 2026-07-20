import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { allowedPaymentMethods, validateStandardProductForPublication } from "@/domain";
import { CommerceRepository, openDatabase } from "@/server/db";

describe("catálogo e carrinho", () => {
  let db: Database.Database;
  let commerce: CommerceRepository;

  beforeEach(() => {
    db = openDatabase(":memory:");
    commerce = new CommerceRepository(db);
  });

  afterEach(() => db.close());

  it("restringe um carrinho misto a Pix", () => {
    expect(allowedPaymentMethods(["STANDARD_PRODUCT"], true)).toEqual(["PIX", "CREDIT_CARD"]);
    expect(allowedPaymentMethods(["STANDARD_PRODUCT", "DTF_BY_METER"], true)).toEqual(["PIX"]);
  });

  it("versiona preço de variante e mescla carrinhos depois do login", () => {
    const category = commerce.createCategory({
      name: "Brindes",
      slug: "brindes-teste",
      description: "Produtos personalizados para empresas.",
      imageUrl: "/images/brindes.jpg",
      seo: {
        title: "Brindes personalizados",
        description: "Catálogo de brindes personalizados.",
        canonicalPath: "/categorias/brindes-teste",
        socialImageUrl: "/images/brindes.jpg",
      },
      displayOrder: 1,
      status: "DRAFT",
    }, "admin");
    expect(category.status).toBe("DRAFT");
    expect(commerce.publishCategory(category.id, "admin").status).toBe("PUBLISHED");
    const aggregate = commerce.createStandardProduct({
      product: {
        code: "CAN-001",
        name: "Caneca personalizada",
        slug: "/produtos/caneca-personalizada",
        summary: "Caneca para ações e equipes.",
        description: "Produto personalizado sob demanda.",
        featured: true,
        displayOrder: 1,
        paymentMethods: ["PIX", "CREDIT_CARD"],
        fulfillmentOptions: ["PICKUP"],
        mainImageUrl: "/images/brindes.jpg",
        gallery: [{ id: "media-caneca", url: "/images/brindes.jpg", alt: "Caneca personalizada branca", position: 0 }],
        seo: {
          title: "Caneca personalizada",
          description: "Compre canecas personalizadas.",
          canonicalPath: "/produtos/caneca-personalizada",
          socialImageUrl: "/images/brindes.jpg",
        },
      },
      configuration: {
        minimumQuantity: 1,
        quantityIncrement: 1,
        personalizationMode: "NONE",
        reviewRequired: false,
        leadTimeBusinessDays: 3,
        fulfillmentOptions: ["PICKUP"],
      },
      categoryIds: [category.id],
      primaryCategoryId: category.id,
      options: [],
      variants: [{
        sku: "CAN-001-PADRAO",
        optionValues: {},
        basePriceCents: 3_000,
        minimumQuantity: 1,
        quantityIncrement: 1,
        stockMode: "TRACKED",
        availableQuantity: 20,
        weightGrams: 350,
        widthCm: 12,
        heightCm: 10,
        lengthCm: 12,
        active: true,
      }],
      personalizationFields: [],
    }, "admin");
    const incompleteDraft = validateStandardProductForPublication({
      ...aggregate,
      product: { ...aggregate.product, mainImageUrl: null, gallery: [] },
      configuration: {
        ...aggregate.configuration,
        fulfillmentOptions: ["PICKUP", "SHIPPING"],
      },
      categories: aggregate.categories.map((category) => ({
        ...category,
        status: "DRAFT",
      })),
      variants: aggregate.variants.map((variant) => ({
        ...variant,
        weightGrams: 0,
        widthCm: 0,
        heightCm: 0,
        lengthCm: 0,
      })),
    });
    expect(incompleteDraft.canPublish).toBe(false);
    expect(incompleteDraft.checks.filter((check) => !check.complete).map((check) => check.code))
      .toEqual(["MEDIA", "CATEGORY", "SHIPPING_DATA"]);

    const updated = commerce.updateStandardProduct(aggregate.product.id, {
      product: {
        name: "Caneca personalizada premium",
        slug: aggregate.product.slug,
        summary: aggregate.product.summary,
        description: aggregate.product.description,
        featured: aggregate.product.featured,
        displayOrder: aggregate.product.displayOrder,
        fulfillmentOptions: aggregate.product.fulfillmentOptions,
        mainImageUrl: aggregate.product.mainImageUrl,
        gallery: aggregate.product.gallery,
        seo: aggregate.product.seo,
      },
      configuration: {
        ...aggregate.configuration,
        personalizationMode: "STRUCTURED_FIELDS",
        reviewRequired: true,
      },
      categoryIds: [category.id],
      primaryCategoryId: category.id,
      options: [{ name: "Cor", values: ["Branca", "Preta"] }],
      variants: [{
        id: aggregate.variants[0].id,
        sku: aggregate.variants[0].sku,
        optionValues: { Cor: "Branca" },
        minimumQuantity: 1,
        quantityIncrement: 1,
        stockMode: "TRACKED",
        availableQuantity: 20,
        weightGrams: 350,
        widthCm: 12,
        heightCm: 10,
        lengthCm: 12,
        active: true,
      }, {
        sku: "CAN-001-PRETA",
        optionValues: { Cor: "Preta" },
        basePriceCents: 3_200,
        minimumQuantity: 1,
        quantityIncrement: 1,
        stockMode: "TRACKED",
        availableQuantity: 5,
        weightGrams: 350,
        widthCm: 12,
        heightCm: 10,
        lengthCm: 12,
        active: true,
      }],
      personalizationFields: [{
        key: "nome_gravacao",
        label: "Nome para gravação",
        type: "TEXT",
        required: true,
        options: [],
        maximumLength: 40,
        priceAdjustmentCents: 500,
      }],
    }, "admin");
    expect(updated.product.name).toBe("Caneca personalizada premium");
    expect(updated.variants).toHaveLength(2);
    expect(updated.personalizationFields[0].key).toBe("nome_gravacao");
    expect(updated.inventoryMovements).toEqual(expect.arrayContaining([
      expect.objectContaining({ variantSku: "CAN-001-PRETA", quantity: 5, type: "INITIAL" }),
    ]));

    commerce.publishStandardProduct(aggregate.product.id, "admin");
    db.prepare("UPDATE categories SET status = 'DRAFT' WHERE id = ?").run(category.id);
    expect(commerce.listCatalog()).toHaveLength(0);
    db.prepare("UPDATE categories SET status = 'PUBLISHED' WHERE id = ?").run(category.id);
    expect(commerce.listCatalog()).toHaveLength(1);
    const variant = aggregate.variants[0];

    const draft = commerce.createVariantPriceTableVersion(variant.id, [
      { minimumQuantity: 1, unitPriceCents: 2_900 },
      { minimumQuantity: 10, unitPriceCents: 2_500 },
    ], "admin");
    commerce.publishVariantPriceTable(draft.id, "admin");
    expect(commerce.calculateStandardPrice(variant.id, 10, { nome_gravacao: "Leal" })).toEqual(
      expect.objectContaining({ unitPriceCents: 2_500, personalizationCents: 500, totalCents: 25_500 }),
    );

    const previous = commerce.getOrCreateCart("a".repeat(64), { id: "customer-1", email: "cliente@example.com" });
    commerce.upsertCartItem(previous.id, { productId: aggregate.product.id, variantId: variant.id, quantity: 2, customization: { nome_gravacao: "Leal" }, artworkAssetId: null });
    const anonymous = commerce.getOrCreateCart("b".repeat(64));
    commerce.upsertCartItem(anonymous.id, { productId: aggregate.product.id, variantId: variant.id, quantity: 1, customization: { nome_gravacao: "Leal" }, artworkAssetId: null });

    const claimed = commerce.claimCart(anonymous.id, { id: "customer-1", email: "cliente@example.com" });
    expect(claimed.customerId).toBe("customer-1");
    expect(claimed.items).toHaveLength(1);
    expect(claimed.items[0].quantity).toBe(3);
  });
});
