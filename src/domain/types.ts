export type ISODateTime = string;

export type ProductType = "DTF_BY_METER" | "STANDARD_PRODUCT";
export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PriceTableStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PaymentMethod = "PIX";
export type FulfillmentOption = "PICKUP" | "SHIPPING";

export type ProductMedia = {
  id: string;
  url: string;
  alt: string;
  position: number;
};

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  socialImageUrl: string | null;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  slug: string;
  type: ProductType;
  summary: string;
  description: string;
  status: ProductStatus;
  featured: boolean;
  displayOrder: number;
  paymentMethods: PaymentMethod[];
  fulfillmentOptions: FulfillmentOption[];
  mainImageUrl: string | null;
  gallery: ProductMedia[];
  seo: SeoMetadata;
  publishedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type DtfProductConfiguration = {
  productId: string;
  minimumMeters: number;
  meterIncrement: number;
  pricingMode: "VOLUME_TOTAL";
  paymentMethods: ["PIX"];
  printableWidthCm: number | null;
  filePolicyId: string;
  productionPolicyId: string;
  fulfillmentOptions: FulfillmentOption[];
};

export type FilePolicy = {
  id: string;
  name: string;
  acceptedExtensions: string[];
  maximumFileSizeMb: number | null;
  minimumResolutionDpi: number | null;
  requiresTransparentBackground: boolean;
  colorPolicy: string;
  preparationGuide: string;
  confirmed: boolean;
};

export type ProductSpecification = {
  id: string;
  productId: string;
  group: string;
  title: string;
  description: string;
  position: number;
  visible: boolean;
  confirmed: boolean;
};

export type ProductionEquipment = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitCapacityMetersPerHour: number;
  active: boolean;
};

export type ProductionPolicy = {
  id: string;
  startTrigger: "PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED";
  standardStartWithinBusinessHours: number;
  customLeadTimeAboveMeters: number;
  largeOrderMode: "MANUAL_CONFIRMATION";
};

export type PriceTier = {
  id: string;
  priceTableId: string;
  minimumMeters: number;
  maximumExclusiveMeters: number | null;
  unitPriceCents: number;
  position: number;
};

export type PriceTable = {
  id: string;
  productId: string;
  version: number;
  status: PriceTableStatus;
  validFrom: ISODateTime | null;
  validUntil: ISODateTime | null;
  createdAt: ISODateTime;
  publishedAt: ISODateTime | null;
  tiers: PriceTier[];
};

export type DtfProductAggregate = {
  product: Product;
  configuration: DtfProductConfiguration;
  filePolicy: FilePolicy | null;
  productionPolicy: ProductionPolicy | null;
  specifications: ProductSpecification[];
  equipment: ProductionEquipment[];
  priceTables: PriceTable[];
};

export type CreateDtfProductInput = {
  product: Omit<
    Product,
    "id" | "type" | "status" | "publishedAt" | "createdAt" | "updatedAt"
  > & {
    status?: "DRAFT";
  };
  configuration: Omit<
    DtfProductConfiguration,
    "productId" | "filePolicyId" | "productionPolicyId"
  >;
  filePolicy: Omit<FilePolicy, "id">;
  productionPolicy: Omit<ProductionPolicy, "id">;
  specifications: Array<Omit<ProductSpecification, "id" | "productId">>;
  equipment: Array<Omit<ProductionEquipment, "id" | "productId">>;
  priceTable: Omit<
    PriceTable,
    | "id"
    | "productId"
    | "version"
    | "status"
    | "createdAt"
    | "publishedAt"
    | "tiers"
  > & {
    status?: PriceTableStatus;
    tiers: Array<
      Omit<PriceTier, "id" | "priceTableId" | "position"> & {
        position?: number;
      }
    >;
  };
};

export type DuplicateProductInput = {
  code: string;
  name: string;
  slug: string;
  featured?: boolean;
};

export type PaymentStatus =
  | "DRAFT"
  | "PENDING_PIX"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED";

export type ArtworkStatus =
  | "UPLOADING"
  | "QUARANTINED"
  | "AUTO_REJECTED"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export type ProductionStatus =
  | "BLOCKED"
  | "QUEUED"
  | "IN_PRODUCTION"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type FulfillmentStatus =
  | "PENDING"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "DELIVERED"
  | "PICKED_UP";

export type PriceSnapshot = {
  priceTableId: string;
  priceTableVersion: number;
  priceTierId: string;
  minimumMeters: number;
  maximumExclusiveMeters: number | null;
  quantityMeters: number;
  unitPriceCents: number;
  subtotalCents: number;
  currency: "BRL";
};

export type Order = {
  id: string;
  code: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  quantityMeters: number;
  priceSnapshot: PriceSnapshot;
  paymentStatus: PaymentStatus;
  artworkStatus: ArtworkStatus;
  productionStatus: ProductionStatus;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentMethod: FulfillmentOption;
  productionReadyAt: ISODateTime | null;
  manualLeadTimeNote: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type OrderEvent = {
  id: string;
  orderId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
};

export type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: ISODateTime;
};

export type PaymentAttemptStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED";

export type PaymentAttempt = {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string;
  idempotencyKey: string;
  amountCents: number;
  currency: "BRL";
  status: PaymentAttemptStatus;
  expiresAt: ISODateTime | null;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type FileScanStatus = "PENDING" | "CLEAN" | "REJECTED" | "FAILED";
export type PreflightStatus =
  | "PENDING"
  | "PASSED"
  | "WARNING"
  | "BLOCKED";
export type ArtworkReviewStatus =
  | "PENDING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type ArtworkVersion = {
  id: string;
  orderId: string;
  version: number;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  scanStatus: FileScanStatus;
  preflightStatus: PreflightStatus;
  reviewStatus: ArtworkReviewStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: ISODateTime | null;
  uploadedBy: string;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
};

export type FiscalDocumentType = "INVOICE" | "RECEIPT";

export type FiscalDocument = {
  id: string;
  orderId: string;
  type: FiscalDocumentType;
  version: number;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isCurrent: boolean;
  uploadedBy: string;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
};

export type ContactSnapshot = {
  name: string;
  email: string;
  phone: string;
};

export type AddressSnapshot = {
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: "BR";
};

export type FiscalSnapshot = {
  requested: boolean;
  partyType: "PF" | "PJ" | null;
  document: string | null;
  legalName: string | null;
  tradeName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  email: string | null;
  phone: string | null;
  address: AddressSnapshot | null;
};

export type OrderCustomerData = {
  orderId: string;
  contact: ContactSnapshot;
  fulfillment: {
    method: FulfillmentOption;
    shippingAddress: AddressSnapshot | null;
    pickupLocationId: string | null;
  };
  fiscal: FiscalSnapshot;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
