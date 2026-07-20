import type Database from "better-sqlite3";

import type { CreateDtfProductInput, Order } from "@/domain";

import { OrderRepository } from "./order-repository";
import { ProductRepository } from "./product-repository";
import { CommerceRepository } from "./commerce-repository";
import { domainId, writeAudit } from "./repository-helpers";

export const INITIAL_DTF_PRODUCT_CODE = "DTF-TEXTIL-METRO";

export type SeedResult = {
  productId: string;
  productCreated: boolean;
  ordersCreated: number;
};

const initialProduct: CreateDtfProductInput = {
  product: {
    code: INITIAL_DTF_PRODUCT_CODE,
    name: "DTF Têxtil por Metro",
    slug: "/dtf/textil-por-metro",
    summary:
      "Produção própria, filme Premium Hot Peel e impressão em alta definição para algodão, poliéster e tecidos mistos.",
    description:
      "DTF têxtil por metro para pequenas e grandes demandas, com revisão humana da arte e acompanhamento do pedido.",
    featured: true,
    displayOrder: 1,
    paymentMethods: ["PIX"],
    fulfillmentOptions: ["PICKUP", "SHIPPING"],
    mainImageUrl: null,
    gallery: [],
    seo: {
      title: "DTF Têxtil por Metro | Leal Brinde",
      description:
        "Impressão DTF têxtil por metro com produção própria, filme Hot Peel e preços por volume.",
      canonicalPath: "/dtf/textil-por-metro",
      socialImageUrl: null,
    },
  },
  configuration: {
    minimumMeters: 1,
    meterIncrement: 1,
    pricingMode: "VOLUME_TOTAL",
    paymentMethods: ["PIX"],
    printableWidthCm: null,
    fulfillmentOptions: ["PICKUP", "SHIPPING"],
  },
  filePolicy: {
    name: "Política de arquivo DTF pendente de confirmação",
    acceptedExtensions: [],
    maximumFileSizeMb: null,
    minimumResolutionDpi: null,
    requiresTransparentBackground: true,
    colorPolicy: "A confirmar com a produção.",
    preparationGuide:
      "Formatos, tamanho máximo, largura útil e parâmetros de aplicação precisam ser confirmados antes da publicação.",
    confirmed: false,
  },
  productionPolicy: {
    startTrigger: "PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED",
    standardStartWithinBusinessHours: 24,
    customLeadTimeAboveMeters: 100,
    largeOrderMode: "MANUAL_CONFIRMATION",
  },
  specifications: [
    {
      group: "Filme",
      title: "PET Premium Hot Peel",
      description: "Remoção a quente para maior produtividade.",
      position: 1,
      visible: true,
      confirmed: false,
    },
    {
      group: "Filme",
      title: "PET de 75 micras Double Matte",
      description:
        "Filme de dupla face fosca, desenvolvido para estabilidade e qualidade de impressão.",
      position: 2,
      visible: true,
      confirmed: false,
    },
    {
      group: "Filme",
      title: "Revestimento microporoso",
      description:
        "Absorção de tinta, nitidez e intensidade de cores em alta definição.",
      position: 3,
      visible: true,
      confirmed: false,
    },
    {
      group: "Adesivo",
      title: "TPU Premium",
      description:
        "Elasticidade, toque macio e resistência às lavagens quando aplicado corretamente.",
      position: 4,
      visible: true,
      confirmed: false,
    },
    {
      group: "Impressão",
      title: "Cabeças Epson i3200",
      description: "Tecnologia voltada a qualidade e produtividade em DTF.",
      position: 5,
      visible: true,
      confirmed: false,
    },
    {
      group: "Impressão",
      title: "Resolução de até 720 × 1440 DPI",
      description: "Definição para detalhes e acabamento.",
      position: 6,
      visible: true,
      confirmed: false,
    },
    {
      group: "Impressão",
      title: "Perfis ICC calibrados",
      description: "Fidelidade de cores e repetibilidade entre produções.",
      position: 7,
      visible: true,
      confirmed: false,
    },
    {
      group: "Compatibilidade",
      title: "Algodão, poliéster e tecidos mistos",
      description: "Compatibilidade sujeita à aplicação correta do material.",
      position: 8,
      visible: true,
      confirmed: false,
    },
  ],
  equipment: [
    {
      name: "Impressora DTF 27 m/h",
      quantity: 2,
      unitCapacityMetersPerHour: 27,
      active: true,
    },
    {
      name: "Impressora DTF 11 m/h",
      quantity: 1,
      unitCapacityMetersPerHour: 11,
      active: true,
    },
  ],
  priceTable: {
    status: "PUBLISHED",
    validFrom: null,
    validUntil: null,
    tiers: [
      {
        minimumMeters: 1,
        maximumExclusiveMeters: 6,
        unitPriceCents: 3_990,
      },
      {
        minimumMeters: 6,
        maximumExclusiveMeters: 11,
        unitPriceCents: 3_490,
      },
      {
        minimumMeters: 11,
        maximumExclusiveMeters: 100,
        unitPriceCents: 3_190,
      },
      {
        minimumMeters: 100,
        maximumExclusiveMeters: null,
        unitPriceCents: 2_790,
      },
    ],
  },
};

export function seedInitialDomain(db: Database.Database): SeedResult {
  const commerce = new CommerceRepository(db);
  if (!commerce.findCategoryBySlug("brindes")) {
    commerce.createCategory(
      {
        name: "Brindes",
        slug: "brindes",
        description: "Produtos personalizados para empresas, eventos e ações de relacionamento.",
        imageUrl: null,
        seo: {
          title: "Brindes personalizados | Leal Brinde",
          description: "Brindes personalizados com compra direta e opções administradas pela Leal Brinde.",
          canonicalPath: "/categorias/brindes",
          socialImageUrl: null,
        },
        displayOrder: 1,
        status: "PUBLISHED",
      },
      "seed",
    );
  }
  const products = new ProductRepository(db);
  const orders = new OrderRepository(db);
  let product = products.list({ search: INITIAL_DTF_PRODUCT_CODE })[0];
  const productCreated = !product;

  if (!product) {
    product = products.createDtfProduct(initialProduct, "seed").product;
  }

  ensureCommercialDifferentials(db, product.id);

  const demoOrders: Array<{
    create: Parameters<OrderRepository["create"]>[0];
    statuses: Parameters<OrderRepository["updateStatuses"]>[1];
  }> = [
    {
      create: {
        code: "DTF-2026-0001",
        productId: product.id,
        customerName: "Estúdio Aurora",
        customerEmail: "compras.aurora@example.com",
        quantityMeters: 5,
        fulfillmentMethod: "PICKUP",
      },
      statuses: {
        paymentStatus: "PAID",
        artworkStatus: "CHANGES_REQUESTED",
        productionStatus: "BLOCKED",
      },
    },
    {
      create: {
        code: "DTF-2026-0002",
        productId: product.id,
        customerName: "Ateliê Horizonte",
        customerEmail: "producao.horizonte@example.com",
        quantityMeters: 20,
        fulfillmentMethod: "SHIPPING",
      },
      statuses: {
        paymentStatus: "PAID",
        artworkStatus: "APPROVED",
        productionStatus: "IN_PRODUCTION",
      },
    },
    {
      create: {
        code: "DTF-2026-0003",
        productId: product.id,
        customerName: "Malharia Vale",
        customerEmail: "pedidos.vale@example.com",
        quantityMeters: 100,
        fulfillmentMethod: "PICKUP",
      },
      statuses: {
        paymentStatus: "PAID",
        artworkStatus: "APPROVED",
        productionStatus: "COMPLETED",
        fulfillmentStatus: "PICKED_UP",
      },
    },
    {
      create: {
        code: "DTF-2026-0004",
        productId: product.id,
        customerName: "Confecções Sul",
        customerEmail: "compras.sul@example.com",
        quantityMeters: 120,
        fulfillmentMethod: "SHIPPING",
      },
      statuses: {
        paymentStatus: "PAID",
        artworkStatus: "APPROVED",
        productionStatus: "QUEUED",
        manualLeadTimeNote: "Prazo combinado conforme a fila de grande volume.",
      },
    },
  ];

  let ordersCreated = 0;
  demoOrders.forEach((demo) => {
    if (orders.findByCode(demo.create.code)) return;
    const order: Order = orders.create(demo.create, "seed");
    orders.updateStatuses(order.id, demo.statuses, "seed");
    ordersCreated += 1;
  });

  return { productId: product.id, productCreated, ordersCreated };
}

const commercialDifferentials = [
  {
    title: "Produção própria",
    description: "Processo realizado na estrutura produtiva da Leal Brinde.",
  },
  {
    title: "Impressão industrial de alta qualidade",
    description: "Estrutura preparada para demandas profissionais de impressão DTF.",
  },
  {
    title: "Cores calibradas com perfil ICC",
    description: "Processo de cor voltado à fidelidade e repetibilidade da produção.",
  },
  {
    title: "Definição em textos finos e detalhes",
    description: "Impressão direcionada à nitidez de elementos pequenos.",
  },
  {
    title: "Filme Premium Hot Peel",
    description: "Filme com remoção a quente para maior produtividade na aplicação.",
  },
  {
    title: "Toque macio",
    description: "Acabamento confortável quando o material é aplicado corretamente.",
  },
  {
    title: "Atendimento em escala",
    description: "Estrutura para pequenas e grandes demandas conforme a fila de produção.",
  },
] as const;

function ensureCommercialDifferentials(
  db: Database.Database,
  productId: string,
): void {
  const exists = db.prepare(
    `SELECT 1 FROM product_specifications
     WHERE product_id = ? AND group_name = 'Diferenciais' AND title = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO product_specifications (
      id, product_id, group_name, title, description,
      position, visible, confirmed
    ) VALUES (?, ?, 'Diferenciais', ?, ?, ?, 1, 0)`,
  );
  let inserted = 0;

  db.transaction(() => {
    commercialDifferentials.forEach((differential, index) => {
      if (exists.get(productId, differential.title)) return;
      insert.run(
        domainId("specification"),
        productId,
        differential.title,
        differential.description,
        20 + index,
      );
      inserted += 1;
    });

    if (inserted > 0) {
      writeAudit(db, {
        actorId: "seed",
        action: "PRODUCT_DIFFERENTIALS_SEEDED",
        entityType: "Product",
        entityId: productId,
        after: { count: inserted },
      });
    }
  })();
}
