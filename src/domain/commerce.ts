import type {
  ArtworkStatus,
  FulfillmentOption,
  ISODateTime,
  PaymentMethod,
  Product,
  ProductStatus,
  ProductType,
  ProductionStatus,
  SeoMetadata,
} from "./types";

export type PersonalizationMode =
  | "NONE"
  | "STRUCTURED_FIELDS"
  | "ARTWORK_UPLOAD";

export type PersonalizationFieldType =
  | "TEXT"
  | "LONG_TEXT"
  | "SELECT"
  | "NUMBER"
  | "COLOR"
  | "NOTE";

export type StockMode = "TRACKED" | "MADE_TO_ORDER";
export type CommerceUnit = "UNIT" | "METER";

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  seo: SeoMetadata;
  displayOrder: number;
  status: ProductStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ProductOptionValue = {
  id: string;
  optionId: string;
  value: string;
  position: number;
};

export type ProductOption = {
  id: string;
  productId: string;
  name: string;
  position: number;
  values: ProductOptionValue[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  optionValues: Record<string, string>;
  basePriceCents: number;
  minimumQuantity: number;
  quantityIncrement: number;
  stockMode: StockMode;
  availableQuantity: number | null;
  reservedQuantity: number;
  weightGrams: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type VariantPriceTier = {
  id: string;
  priceTableId: string;
  minimumQuantity: number;
  maximumExclusiveQuantity: number | null;
  unitPriceCents: number;
  position: number;
};

export type VariantPriceTable = {
  id: string;
  variantId: string;
  version: number;
  status: ProductStatus;
  validFrom: ISODateTime | null;
  validUntil: ISODateTime | null;
  createdAt: ISODateTime;
  publishedAt: ISODateTime | null;
  tiers: VariantPriceTier[];
};

export type PersonalizationField = {
  id: string;
  productId: string;
  key: string;
  label: string;
  type: PersonalizationFieldType;
  required: boolean;
  options: string[];
  maximumLength: number | null;
  priceAdjustmentCents: number;
  position: number;
};

export type StandardProductConfiguration = {
  productId: string;
  minimumQuantity: number;
  quantityIncrement: number;
  personalizationMode: PersonalizationMode;
  reviewRequired: boolean;
  leadTimeBusinessDays: number;
  fulfillmentOptions: FulfillmentOption[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type StandardProductAggregate = {
  product: Product;
  configuration: StandardProductConfiguration;
  categories: Category[];
  options: ProductOption[];
  variants: ProductVariant[];
  priceTables: VariantPriceTable[];
  personalizationFields: PersonalizationField[];
  inventoryMovements: InventoryMovement[];
};

export type InventoryMovement = {
  id: string;
  variantId: string;
  variantSku: string;
  orderId: string | null;
  type: "INITIAL" | "ADJUSTMENT" | "RESERVATION" | "RELEASE" | "COMMITMENT";
  quantity: number;
  reason: string;
  actorId: string;
  createdAt: ISODateTime;
};

export type StandardProductSummary = {
  product: Product;
  primaryCategory: Category | null;
  minimumPriceCents: number | null;
  maximumPriceCents: number | null;
  available: boolean;
  madeToOrder: boolean;
};

export type StandardProductPriceQuote = {
  variantId: string;
  priceTableId: string | null;
  priceTableVersion: number | null;
  priceTierId: string | null;
  quantity: number;
  unitPriceCents: number;
  personalizationCents: number;
  totalCents: number;
  currency: "BRL";
};

export type Cart = {
  id: string;
  customerId: string | null;
  customerEmail: string | null;
  status: "ACTIVE" | "CONVERTED" | "ABANDONED";
  expiresAt: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  items: CartItem[];
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unit: CommerceUnit;
  customization: Record<string, string | number>;
  artworkAssetId: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type CartLine = CartItem & {
  product: Product;
  variant: ProductVariant | null;
  unitPriceCents: number;
  personalizationCents: number;
  totalCents: number;
};

export type OrderItemArtworkStatus = ArtworkStatus | "NOT_REQUIRED";

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  productType: ProductType;
  productName: string;
  sku: string | null;
  quantity: number;
  unit: CommerceUnit;
  unitPriceCents: number;
  totalCents: number;
  priceSnapshot: Record<string, unknown>;
  customizationSnapshot: Record<string, unknown>;
  shippingSnapshot: Record<string, unknown>;
  artworkStatus: OrderItemArtworkStatus;
  productionStatus: ProductionStatus;
  productionReadyAt: ISODateTime | null;
  manualLeadTimeNote: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type CommerceSettings = {
  catalogEnabled: boolean;
  directCheckoutEnabled: boolean;
  cardEnabled: boolean;
  shippingEnabled: boolean;
  maxInstallments: number;
  statementDescriptor: string;
  updatedAt: ISODateTime;
};

export function allowedPaymentMethods(
  productTypes: ProductType[],
  cardEnabled: boolean,
): PaymentMethod[] {
  if (productTypes.includes("DTF_BY_METER")) return ["PIX"];
  return cardEnabled ? ["PIX", "CREDIT_CARD"] : ["PIX"];
}

export function isVariantAvailable(variant: ProductVariant): boolean {
  if (!variant.active) return false;
  if (variant.stockMode === "MADE_TO_ORDER") return true;
  return (variant.availableQuantity ?? 0) - variant.reservedQuantity > 0;
}

export function assertQuantityRule(
  quantity: number,
  minimum: number,
  increment: number,
): void {
  if (!Number.isInteger(quantity) || quantity < minimum) {
    throw new Error(`A quantidade mínima é ${minimum}.`);
  }
  if ((quantity - minimum) % increment !== 0) {
    throw new Error(`A quantidade deve avançar de ${increment} em ${increment}.`);
  }
}

export type CreateStandardProductInput = {
  product: Omit<
    Product,
    "id" | "type" | "status" | "publishedAt" | "createdAt" | "updatedAt"
  >;
  configuration: Omit<
    StandardProductConfiguration,
    "productId" | "createdAt" | "updatedAt"
  >;
  categoryIds: string[];
  primaryCategoryId: string | null;
  options: Array<{ name: string; values: string[] }>;
  variants: Array<
    Omit<ProductVariant, "id" | "productId" | "reservedQuantity" | "createdAt" | "updatedAt">
  >;
  personalizationFields: Array<
    Omit<PersonalizationField, "id" | "productId" | "position"> & { position?: number }
  >;
};

export type UpdateStandardProductInput = {
  product: Pick<
    Product,
    | "name"
    | "slug"
    | "summary"
    | "description"
    | "featured"
    | "displayOrder"
    | "fulfillmentOptions"
    | "mainImageUrl"
    | "gallery"
    | "seo"
  >;
  configuration: Pick<
    StandardProductConfiguration,
    | "minimumQuantity"
    | "quantityIncrement"
    | "personalizationMode"
    | "reviewRequired"
    | "leadTimeBusinessDays"
    | "fulfillmentOptions"
  >;
  categoryIds: string[];
  primaryCategoryId: string | null;
  options: Array<{ name: string; values: string[] }>;
  variants: Array<{
    id?: string;
    sku: string;
    optionValues: Record<string, string>;
    basePriceCents?: number;
    minimumQuantity: number;
    quantityIncrement: number;
    stockMode: StockMode;
    availableQuantity?: number | null;
    weightGrams: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
    active: boolean;
  }>;
  personalizationFields: Array<
    Omit<PersonalizationField, "id" | "productId" | "position"> & { position?: number }
  >;
};

export type StandardProductPublicationCheck = {
  code: string;
  label: string;
  complete: boolean;
  message: string;
};

export function validateStandardProductForPublication(
  aggregate: StandardProductAggregate,
): { canPublish: boolean; checks: StandardProductPublicationCheck[] } {
  const activeVariants = aggregate.variants.filter((variant) => variant.active);
  const shippingEnabled = aggregate.configuration.fulfillmentOptions.includes("SHIPPING");
  const checks: StandardProductPublicationCheck[] = [
    {
      code: "BASIC_CONTENT",
      label: "Conteúdo comercial",
      complete: Boolean(aggregate.product.name.trim() && aggregate.product.summary.trim() && aggregate.product.description.trim()),
      message: "Nome, resumo e descrição precisam estar preenchidos.",
    },
    {
      code: "MEDIA",
      label: "Imagem e acessibilidade",
      complete: Boolean(aggregate.product.mainImageUrl && aggregate.product.gallery.some((media) => media.url === aggregate.product.mainImageUrl && media.alt.trim())),
      message: "A imagem principal precisa estar na galeria e ter texto alternativo.",
    },
    {
      code: "SEO",
      label: "SEO básico",
      complete: Boolean(aggregate.product.seo.title.trim() && aggregate.product.seo.description.trim() && aggregate.product.seo.canonicalPath.trim()),
      message: "Título, descrição e URL canônica são obrigatórios.",
    },
    {
      code: "CATEGORY",
      label: "Categoria",
      complete: aggregate.categories.some((category) => category.status === "PUBLISHED"),
      message: "Selecione ao menos uma categoria publicada.",
    },
    {
      code: "FULFILLMENT",
      label: "Atendimento",
      complete: aggregate.configuration.fulfillmentOptions.length > 0,
      message: "Habilite retirada local ou entrega nacional.",
    },
    {
      code: "VARIANTS",
      label: "Variantes comercializáveis",
      complete: activeVariants.length > 0 && activeVariants.every((variant) => variant.sku.trim() && variant.basePriceCents > 0),
      message: "Mantenha ao menos uma variante ativa com SKU e preço.",
    },
    {
      code: "SHIPPING_DATA",
      label: "Dados de envio",
      complete: !shippingEnabled || activeVariants.every((variant) => variant.weightGrams > 0 && variant.widthCm > 0 && variant.heightCm > 0 && variant.lengthCm > 0),
      message: "Peso e dimensões são obrigatórios para todas as variantes enviadas.",
    },
    {
      code: "PERSONALIZATION",
      label: "Personalização",
      complete: aggregate.configuration.personalizationMode !== "STRUCTURED_FIELDS" || aggregate.personalizationFields.length > 0,
      message: "Cadastre os campos estruturados ou altere o modo de personalização.",
    },
  ];
  return { canPublish: checks.every((check) => check.complete), checks };
}
