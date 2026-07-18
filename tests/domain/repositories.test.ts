import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PublicationValidationError } from "@/domain";
import {
  ArtworkVersionRepository,
  AuditRepository,
  FiscalDocumentRepository,
  openDatabase,
  OrderRepository,
  PaymentAttemptRepository,
  ProductRepository,
  seedInitialDomain,
} from "@/server/db";

describe("persistência do domínio", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("executa migração e seed repetidamente sem duplicar dados", () => {
    const first = seedInitialDomain(db);
    const second = seedInitialDomain(db);
    const products = new ProductRepository(db).list();
    const orders = new OrderRepository(db).list();

    expect(first.productCreated).toBe(true);
    expect(first.ordersCreated).toBe(4);
    expect(second.productCreated).toBe(false);
    expect(second.ordersCreated).toBe(0);
    expect(products).toHaveLength(1);
    expect(orders).toHaveLength(4);
  });

  it("mantém o produto inicial em rascunho até confirmar dados técnicos", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const aggregate = products.getDtfAggregate(result.productId)!;

    expect(aggregate.product.status).toBe("DRAFT");
    expect(() => products.publishProduct(result.productId, "admin")).toThrow(
      PublicationValidationError,
    );
    expect(aggregate.equipment).toHaveLength(2);
    expect(
      aggregate.specifications.filter(
        (specification) => specification.group === "Diferenciais",
      ),
    ).toHaveLength(7);
  });

  it("duplica produto e tabela sem compartilhar registros versionados", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const duplicate = products.duplicateProduct(
      result.productId,
      {
        code: "DTF-TESTE-2",
        name: "DTF Teste 2",
        slug: "/dtf/teste-2",
      },
      "admin",
    );
    const original = products.getDtfAggregate(result.productId)!;

    expect(duplicate.product.status).toBe("DRAFT");
    expect(duplicate.priceTables[0].id).not.toBe(original.priceTables[0].id);
    expect(duplicate.priceTables[0].status).toBe("DRAFT");
    expect(products.archiveProduct(duplicate.product.id).status).toBe("ARCHIVED");
  });

  it("atualiza políticas e conteúdo estruturado sem campos JSON no painel", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const initial = products.getDtfAggregate(result.productId)!;

    products.updateDtfConfiguration(result.productId, {
      minimumMeters: 1,
      meterIncrement: 1,
      printableWidthCm: 56,
      fulfillmentOptions: ["PICKUP"],
    });
    products.updateFilePolicy(result.productId, {
      acceptedExtensions: ["PNG", "PDF", "TIFF"],
      maximumFileSizeMb: 50,
      minimumResolutionDpi: 300,
      requiresTransparentBackground: true,
      colorPolicy: "Usar o perfil de cor confirmado pela produção.",
      preparationGuide: "Preparar a arte na largura útil e sem fundo.",
      confirmed: true,
    });
    products.replaceSpecifications(
      result.productId,
      initial.specifications.map((specification) => ({
        group: specification.group,
        title: specification.title,
        description: specification.description,
        position: specification.position,
        visible: specification.visible,
        confirmed: true,
      })),
    );
    products.replaceProductionSettings(result.productId, {
      equipment: [
        { name: "Impressora principal", quantity: 2, unitCapacityMetersPerHour: 27 },
        { name: "Impressora auxiliar", quantity: 1, unitCapacityMetersPerHour: 11 },
      ],
      standardStartWithinBusinessHours: 24,
      customLeadTimeAboveMeters: 100,
      fulfillmentOptions: ["PICKUP"],
    });
    products.updatePaymentPolicy(result.productId, {
      pixExpirationMinutes: 45,
      refundPolicy: "Reembolso analisado conforme o estado da produção.",
    });

    const updated = products.getDtfAggregate(result.productId)!;
    expect(updated.configuration.printableWidthCm).toBe(56);
    expect(updated.filePolicy).toEqual(
      expect.objectContaining({ confirmed: true, maximumFileSizeMb: 50 }),
    );
    expect(updated.specifications.every((item) => item.confirmed)).toBe(true);
    expect(updated.equipment).toHaveLength(2);
    expect(products.getPaymentPolicy(result.productId)).toEqual(
      expect.objectContaining({ pixExpirationMinutes: 45 }),
    );
  });

  it("versiona preços e preserva o snapshot de pedidos antigos", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const orders = new OrderRepository(db);
    const oldOrder = orders.create({
      code: "DTF-TEST-SNAPSHOT",
      productId: result.productId,
      customerName: "Cliente Teste",
      customerEmail: "cliente@example.com",
      quantityMeters: 5,
      fulfillmentMethod: "PICKUP",
    });

    const nextTable = products.createPriceTableVersion(result.productId, [
      {
        minimumMeters: 1,
        maximumExclusiveMeters: null,
        unitPriceCents: 5_000,
      },
    ]);
    products.publishPriceTable(nextTable.id);

    expect(oldOrder.priceSnapshot.unitPriceCents).toBe(3_990);
    expect(products.calculatePrice(result.productId, 5).unitPriceCents).toBe(5_000);
  });

  it("substitui o rascunho anterior e persiste a vigência da nova versão", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const firstDraft = products.createPriceTableVersion(
      result.productId,
      [
        {
          minimumMeters: 1,
          maximumExclusiveMeters: null,
          unitPriceCents: 4_500,
        },
      ],
      { validFrom: "2099-08-01T12:00:00.000Z" },
    );
    const firstTierId = firstDraft.tiers[0].id;

    const replacement = products.createPriceTableVersion(
      result.productId,
      [
        {
          minimumMeters: 1,
          maximumExclusiveMeters: null,
          unitPriceCents: 4_700,
        },
      ],
      { validFrom: "2099-09-01T12:00:00.000Z" },
    );

    const aggregate = products.getDtfAggregate(result.productId)!;
    expect(aggregate.priceTables.filter((table) => table.status === "DRAFT")).toEqual([
      expect.objectContaining({
        id: replacement.id,
        validFrom: "2099-09-01T12:00:00.000Z",
      }),
    ]);
    expect(replacement.version).toBe(firstDraft.version + 1);
    expect(
      db.prepare("SELECT 1 FROM price_tables WHERE id = ?").get(firstDraft.id),
    ).toBeUndefined();
    expect(
      db.prepare("SELECT 1 FROM price_tiers WHERE id = ?").get(firstTierId),
    ).toBeUndefined();
  });

  it("mantém o preço vigente até a data de uma publicação agendada", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const currentQuote = products.calculatePrice(
      result.productId,
      5,
      "2099-07-31T23:59:59.999Z",
    );
    const scheduled = products.createPriceTableVersion(
      result.productId,
      [
        {
          minimumMeters: 1,
          maximumExclusiveMeters: null,
          unitPriceCents: 5_000,
        },
      ],
      { validFrom: "2099-08-01T00:00:00.000Z" },
    );

    products.publishPriceTable(scheduled.id);

    const aggregate = products.getDtfAggregate(result.productId)!;
    const previous = aggregate.priceTables.find(
      (table) => table.id === currentQuote.priceTableId,
    );
    expect(previous).toEqual(
      expect.objectContaining({
        status: "PUBLISHED",
        validUntil: "2099-08-01T00:00:00.000Z",
      }),
    );
    expect(
      products.calculatePrice(result.productId, 5, "2099-07-31T23:59:59.999Z")
        .unitPriceCents,
    ).toBe(3_990);
    expect(
      products.calculatePrice(result.productId, 5, "2099-08-01T00:00:00.000Z")
        .unitPriceCents,
    ).toBe(5_000);
  });

  it("bloqueia produção antes de pagamento e aprovação", () => {
    seedInitialDomain(db);
    const orders = new OrderRepository(db);
    const order = orders.findByCode("DTF-2026-0001")!;

    expect(() =>
      orders.updateStatuses(
        order.id,
        { productionStatus: "IN_PRODUCTION" },
        "operator",
      ),
    ).toThrow("pagamento confirmado e arte aprovada");
  });

  it("aplica o limite configurado do produto para exigir prazo manual", () => {
    const result = seedInitialDomain(db);
    const products = new ProductRepository(db);
    const aggregate = products.getDtfAggregate(result.productId)!;
    products.replaceProductionSettings(result.productId, {
      equipment: aggregate.equipment.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitCapacityMetersPerHour: item.unitCapacityMetersPerHour,
      })),
      standardStartWithinBusinessHours: 8,
      customLeadTimeAboveMeters: 10,
      fulfillmentOptions: aggregate.configuration.fulfillmentOptions,
    });

    const orders = new OrderRepository(db);
    const order = orders.findByCode("DTF-2026-0002")!;
    expect(() =>
      orders.updateStatuses(
        order.id,
        { productionStatus: "IN_PRODUCTION" },
        "operator",
      ),
    ).toThrow("acima de 10 metros");

    const updated = orders.updateStatuses(
      order.id,
      {
        productionStatus: "IN_PRODUCTION",
        manualLeadTimeNote: "Início combinado para o próximo dia útil.",
      },
      "operator",
    );
    expect(updated.manualLeadTimeNote).toContain("próximo dia útil");
  });

  it("consulta pedidos do cliente sem expor pedidos de outro e-mail", () => {
    seedInitialDomain(db);
    const orders = new OrderRepository(db);

    expect(
      orders.listForCustomerEmail("COMPRAS.AURORA@EXAMPLE.COM").map((order) => order.code),
    ).toEqual(["DTF-2026-0001"]);
    expect(
      orders.findByCodeForCustomerEmail(
        "DTF-2026-0002",
        "compras.aurora@example.com",
      ),
    ).toBeNull();
  });

  it("faz upload, preflight, Pix, aprovação e produção sem SQL externo", () => {
    const result = seedInitialDomain(db);
    const orders = new OrderRepository(db);
    const artworks = new ArtworkVersionRepository(db);
    const payments = new PaymentAttemptRepository(db);
    const order = orders.create({
      code: "DTF-TEST-FLOW",
      productId: result.productId,
      customerName: "Fluxo Teste",
      customerEmail: "fluxo@example.com",
      quantityMeters: 99,
      fulfillmentMethod: "PICKUP",
    });

    expect(() =>
      payments.create({
        orderId: order.id,
        provider: "fake",
        providerReference: "pix-too-soon",
        idempotencyKey: "pix-too-soon",
        amountCents: order.priceSnapshot.subtotalCents,
        expiresAt: null,
      }),
    ).toThrow("validação mínima");

    const artwork = artworks.createVersion({
      orderId: order.id,
      storageKey: `orders/${order.id}/artwork/v1/file.png`,
      originalFilename: "arte.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      checksumSha256: "a".repeat(64),
      uploadedBy: "customer",
    });
    artworks.recordPreflight(artwork.id, "CLEAN", "PASSED", {});

    const payment = payments.create({
      orderId: order.id,
      provider: "fake",
      providerReference: "pix-flow",
      idempotencyKey: "pix-flow",
      amountCents: order.priceSnapshot.subtotalCents,
      expiresAt: null,
    });
    expect(
      payments.create({
        orderId: order.id,
        provider: "fake",
        providerReference: "pix-flow",
        idempotencyKey: "pix-flow",
        amountCents: order.priceSnapshot.subtotalCents,
        expiresAt: null,
      }).id,
    ).toBe(payment.id);

    payments.transition(payment.id, "PAID");
    artworks.review(artwork.id, "APPROVED", null, "operator");
    expect(() =>
      artworks.review(artwork.id, "CHANGES_REQUESTED", "Trocar fonte", "operator"),
    ).toThrow("já recebeu uma decisão");
    const released = orders.updateStatuses(
      order.id,
      { productionStatus: "QUEUED" },
      "operator",
    );

    expect(released.paymentStatus).toBe("PAID");
    expect(released.artworkStatus).toBe("APPROVED");
    expect(released.productionStatus).toBe("QUEUED");
    expect(released.priceSnapshot.subtotalCents).toBe(315_810);

    orders.updateStatuses(
      order.id,
      { productionStatus: "BLOCKED" },
      "finance",
    );
    payments.transition(payment.id, "REFUNDED", "finance");
    const refunded = orders.findById(order.id)!;
    expect(refunded.paymentStatus).toBe("REFUNDED");
    expect(refunded.productionStatus).toBe("BLOCKED");
  });

  it("concilia um Pix confirmado depois da expiração local sem regredir o pedido", () => {
    const result = seedInitialDomain(db);
    const orders = new OrderRepository(db);
    const artworks = new ArtworkVersionRepository(db);
    const payments = new PaymentAttemptRepository(db);
    const order = orders.create({
      code: "DTF-LATE-PIX",
      productId: result.productId,
      customerName: "Cliente Pix",
      customerEmail: "pix@example.com",
      quantityMeters: 5,
      fulfillmentMethod: "PICKUP",
    });
    const artwork = artworks.createVersion({
      orderId: order.id,
      storageKey: `orders/${order.id}/artwork/v1/file.png`,
      originalFilename: "arte.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      checksumSha256: "b".repeat(64),
      uploadedBy: "customer",
    });
    artworks.recordPreflight(artwork.id, "CLEAN", "PASSED", {});

    const expiredAttempt = payments.create({
      orderId: order.id,
      provider: "fake",
      providerReference: "pix-expired",
      idempotencyKey: "pix-expired",
      amountCents: order.priceSnapshot.subtotalCents,
      expiresAt: new Date(0).toISOString(),
    });
    payments.transition(expiredAttempt.id, "EXPIRED");
    const currentAttempt = payments.create({
      orderId: order.id,
      provider: "fake",
      providerReference: "pix-current",
      idempotencyKey: "pix-current",
      amountCents: order.priceSnapshot.subtotalCents,
      expiresAt: null,
    });

    payments.transition(expiredAttempt.id, "PAID");
    expect(orders.findById(order.id)?.paymentStatus).toBe("PAID");
    payments.transition(currentAttempt.id, "EXPIRED");
    expect(orders.findById(order.id)?.paymentStatus).toBe("PAID");
  });

  it("versiona documentos fiscais privados e registra auditoria", () => {
    seedInitialDomain(db);
    const order = new OrderRepository(db).findByCode("DTF-2026-0003")!;
    const documents = new FiscalDocumentRepository(db);
    const audits = new AuditRepository(db);

    const first = documents.add({
      orderId: order.id,
      type: "INVOICE",
      storageKey: `orders/${order.id}/fiscal/nf-v1.pdf`,
      originalFilename: "nota-fiscal.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      uploadedBy: "finance",
    });
    const second = documents.add({
      orderId: order.id,
      type: "INVOICE",
      storageKey: `orders/${order.id}/fiscal/nf-v2.pdf`,
      originalFilename: "nota-fiscal-corrigida.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2500,
      uploadedBy: "finance",
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(documents.currentForOrder(order.id, "INVOICE")).toEqual([second]);
    expect(audits.listForEntity("FiscalDocument", second.id)).toHaveLength(1);
    expect(() =>
      documents.add({
        orderId: order.id,
        type: "RECEIPT",
        storageKey: "https://public.example.com/receipt.pdf",
        originalFilename: "recibo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        uploadedBy: "finance",
      }),
    ).toThrow("chave privada");
  });

  it("persiste snapshots de contato, entrega e fiscal com CNPJ alfanumérico", () => {
    seedInitialDomain(db);
    const orders = new OrderRepository(db);
    const order = orders.findByCode("DTF-2026-0002")!;

    const saved = orders.saveCustomerData(order.id, {
      contact: {
        name: "Ateliê Horizonte",
        email: "fiscal.horizonte@example.com",
        phone: "41999999999",
      },
      fulfillment: {
        method: "SHIPPING",
        pickupLocationId: null,
        shippingAddress: {
          postalCode: "80000000",
          street: "Rua das Cores",
          number: "100",
          complement: null,
          district: "Centro",
          city: "Curitiba",
          state: "PR",
          country: "BR",
        },
      },
      fiscal: {
        requested: true,
        partyType: "PJ",
        document: "1A.234.567/8901-23",
        legalName: "Ateliê Horizonte Ltda",
        tradeName: "Ateliê Horizonte",
        stateRegistration: null,
        municipalRegistration: null,
        email: "fiscal.horizonte@example.com",
        phone: "41999999999",
        address: null,
      },
    });

    expect(saved.fiscal.document).toBe("1A234567890123");
    expect(orders.getCustomerData(order.id)).toEqual(saved);
    const customerDataAudit = new AuditRepository(db)
      .listForEntity("Order", order.id)
      .find((entry) => entry.action === "ORDER_CUSTOMER_DATA_SAVED");
    expect(customerDataAudit?.after).toEqual(
      expect.objectContaining({ fiscalRequested: true, fiscalPartyType: "PJ" }),
    );
  });
});
