import type { Icon } from "@phosphor-icons/react";

export type LoadState = "ready" | "loading" | "empty" | "error";

export type SemanticTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: Icon;
  badge?: number;
  exact?: boolean;
};

export type AdminIdentity = {
  name: string;
  role: string;
  initials: string;
};

export type PendingQueueItem = {
  id: string;
  label: string;
  description: string;
  count: number;
  href: string;
  tone?: SemanticTone;
};

export type OperationsAlert = {
  id: string;
  title: string;
  description: string;
  tone: Exclude<SemanticTone, "neutral">;
  href?: string;
  actionLabel?: string;
};

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type OperationsProduct = {
  id: string;
  name: string;
  code: string;
  slug: string;
  typeLabel: string;
  status: ProductStatus;
  priceSummary: string;
  updatedAtLabel: string;
  featured?: boolean;
  orderCount?: number;
  editHref: string;
  previewHref?: string;
};

export type PriceTierData = {
  id: string;
  minimumMeters: number;
  maximumMeters?: number;
  unitPriceCents: number;
};

export type ProductSpecificationData = {
  id: string;
  group: string;
  title: string;
  description: string;
  position: number;
  visible: boolean;
  confirmed: boolean;
};

export type ProductionEquipmentData = {
  id: string;
  name: string;
  quantity: number;
  metersPerHour: number;
};

export type ProductMediaData = {
  id: string;
  url: string;
  alt: string;
  position: number;
};

export type PublicationCheck = {
  id: string;
  label: string;
  description?: string;
  complete: boolean;
};

export type ProductEditorData = {
  id: string;
  name: string;
  internalCode: string;
  slug: string;
  summary: string;
  description: string;
  type: "DTF_BY_METER" | "STANDARD_PRODUCT";
  status: ProductStatus;
  featured: boolean;
  unit: string;
  minimumMeters: number;
  meterIncrement: number;
  priceTableName: string;
  priceTableId?: string;
  priceTableStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  priceEffectiveFrom?: string;
  priceTiers: PriceTierData[];
  priceHistory: Array<{
    id: string;
    version: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    validFromLabel: string;
    validUntilLabel?: string;
    tierCount: number;
    active: boolean;
  }>;
  specifications: ProductSpecificationData[];
  acceptedFormats: string[];
  maximumFileSizeMb?: number;
  printableWidthCm?: number;
  recommendedDpi?: number;
  requiresTransparentBackground: boolean;
  filePolicyConfirmed: boolean;
  backgroundPolicy: string;
  colorPolicy: string;
  filePreparationGuide: string;
  equipment: ProductionEquipmentData[];
  standardStartWithinBusinessHours: number;
  customLeadTimeAboveMeters: number;
  pickupEnabled: boolean;
  shippingEnabled: boolean;
  pixExpirationMinutes: number;
  refundPolicy: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  media: ProductMediaData[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl?: string;
  socialImageUrl?: string;
  publicationChecks: PublicationCheck[];
};

export type OperationsOrderStatus =
  | "ACTION_REQUIRED"
  | "PENDING_PAYMENT"
  | "ARTWORK_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type OperationsOrder = {
  id: string;
  code: string;
  customerName: string;
  productName: string;
  quantityLabel: string;
  totalLabel: string;
  status: OperationsOrderStatus;
  statusLabel: string;
  updatedAtLabel: string;
  detailHref: string;
  requiresAction?: boolean;
  actionLabel?: string;
};

export type TimelineEventState = "complete" | "current" | "pending" | "issue";

export type OrderTimelineEvent = {
  id: string;
  title: string;
  description?: string;
  occurredAtLabel?: string;
  state: TimelineEventState;
};

export type ArtworkReviewData = {
  versionId: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  productName: string;
  quantityLabel: string;
  versionLabel: string;
  fileName: string;
  fileSizeLabel: string;
  submittedAtLabel: string;
  downloadHref: string;
  previewHref?: string;
  automaticChecks: Array<{
    id: string;
    label: string;
    result: "passed" | "warning" | "failed";
    detail?: string;
  }>;
};

export type CustomerActionItem = {
  id: string;
  orderCode: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  dueLabel?: string;
};

export type CustomerOrderSummary = {
  id: string;
  code: string;
  productName: string;
  quantityLabel: string;
  totalLabel: string;
  statusLabel: string;
  statusTone: SemanticTone;
  updatedAtLabel: string;
  href: string;
};

export type OrderFileData = {
  id: string;
  name: string;
  versionLabel: string;
  statusLabel: string;
  statusTone: SemanticTone;
  submittedAtLabel: string;
  downloadHref?: string;
  replaceHref?: string;
};

export type OrderDocumentData = {
  id: string;
  title: string;
  numberLabel?: string;
  issuedAtLabel?: string;
  downloadHref: string;
};

export type CustomerOrderDetailData = {
  id: string;
  code: string;
  productName: string;
  quantityLabel: string;
  unitPriceLabel: string;
  subtotalLabel: string;
  shippingLabel?: string;
  totalLabel: string;
  statusLabel: string;
  statusTone: SemanticTone;
  placedAtLabel: string;
  action?: {
    title: string;
    description: string;
    actionLabel: string;
    href: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
  timeline: OrderTimelineEvent[];
  files: OrderFileData[];
  payment: {
    methodLabel: string;
    statusLabel: string;
    statusTone: SemanticTone;
    paidAtLabel?: string;
    receiptHref?: string;
  };
  fulfillment: {
    methodLabel: string;
    statusLabel: string;
    addressOrPickupLabel: string;
    trackingCode?: string;
    trackingHref?: string;
  };
  documents: OrderDocumentData[];
  supportHref?: string;
  reorderHref?: string;
};
