import type {
  AuditLog,
  ArtworkVersion,
  DtfProductConfiguration,
  FilePolicy,
  FiscalDocument,
  Order,
  OrderCustomerData,
  OrderEvent,
  PaymentAttempt,
  PriceTable,
  PriceTier,
  Product,
  ProductionEquipment,
  ProductionPolicy,
  ProductSpecification,
} from "@/domain";

export type SqlRow = Record<string, unknown>;

function text(row: SqlRow, key: string): string {
  return String(row[key]);
}

function nullableText(row: SqlRow, key: string): string | null {
  return row[key] === null || row[key] === undefined ? null : String(row[key]);
}

function number(row: SqlRow, key: string): number {
  return Number(row[key]);
}

function nullableNumber(row: SqlRow, key: string): number | null {
  return row[key] === null || row[key] === undefined ? null : Number(row[key]);
}

function boolean(row: SqlRow, key: string): boolean {
  return Number(row[key]) === 1;
}

function json<T>(row: SqlRow, key: string): T {
  return JSON.parse(text(row, key)) as T;
}

function nullableJson<T>(row: SqlRow, key: string): T | null {
  const value = nullableText(row, key);
  return value ? (JSON.parse(value) as T) : null;
}

export function mapProduct(row: SqlRow): Product {
  return {
    id: text(row, "id"),
    code: text(row, "code"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    type: text(row, "type") as Product["type"],
    summary: text(row, "summary"),
    description: text(row, "description"),
    status: text(row, "status") as Product["status"],
    featured: boolean(row, "featured"),
    displayOrder: number(row, "display_order"),
    paymentMethods: json(row, "payment_methods_json"),
    fulfillmentOptions: json(row, "fulfillment_options_json"),
    mainImageUrl: nullableText(row, "main_image_url"),
    gallery: json(row, "gallery_json"),
    seo: json(row, "seo_json"),
    publishedAt: nullableText(row, "published_at"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export function mapDtfConfiguration(row: SqlRow): DtfProductConfiguration {
  return {
    productId: text(row, "product_id"),
    minimumMeters: number(row, "minimum_meters"),
    meterIncrement: number(row, "meter_increment"),
    pricingMode: "VOLUME_TOTAL",
    paymentMethods: json(row, "payment_methods_json"),
    printableWidthCm: nullableNumber(row, "printable_width_cm"),
    filePolicyId: text(row, "file_policy_id"),
    productionPolicyId: text(row, "production_policy_id"),
    fulfillmentOptions: json(row, "fulfillment_options_json"),
  };
}

export function mapFilePolicy(row: SqlRow): FilePolicy {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    acceptedExtensions: json(row, "accepted_extensions_json"),
    maximumFileSizeMb: nullableNumber(row, "maximum_file_size_mb"),
    minimumResolutionDpi: nullableNumber(row, "minimum_resolution_dpi"),
    requiresTransparentBackground: boolean(
      row,
      "requires_transparent_background",
    ),
    colorPolicy: text(row, "color_policy"),
    preparationGuide: text(row, "preparation_guide"),
    confirmed: boolean(row, "confirmed"),
  };
}

export function mapProductionPolicy(row: SqlRow): ProductionPolicy {
  return {
    id: text(row, "id"),
    startTrigger: "PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED",
    standardStartWithinBusinessHours: number(
      row,
      "standard_start_within_business_hours",
    ),
    customLeadTimeAboveMeters: number(row, "custom_lead_time_above_meters"),
    largeOrderMode: "MANUAL_CONFIRMATION",
  };
}

export function mapSpecification(row: SqlRow): ProductSpecification {
  return {
    id: text(row, "id"),
    productId: text(row, "product_id"),
    group: text(row, "group_name"),
    title: text(row, "title"),
    description: text(row, "description"),
    position: number(row, "position"),
    visible: boolean(row, "visible"),
    confirmed: boolean(row, "confirmed"),
  };
}

export function mapEquipment(row: SqlRow): ProductionEquipment {
  return {
    id: text(row, "id"),
    productId: text(row, "product_id"),
    name: text(row, "name"),
    quantity: number(row, "quantity"),
    unitCapacityMetersPerHour: number(
      row,
      "unit_capacity_meters_per_hour",
    ),
    active: boolean(row, "active"),
  };
}

export function mapPriceTier(row: SqlRow): PriceTier {
  return {
    id: text(row, "id"),
    priceTableId: text(row, "price_table_id"),
    minimumMeters: number(row, "minimum_meters"),
    maximumExclusiveMeters: nullableNumber(row, "maximum_exclusive_meters"),
    unitPriceCents: number(row, "unit_price_cents"),
    position: number(row, "position"),
  };
}

export function mapPriceTable(row: SqlRow, tiers: PriceTier[]): PriceTable {
  return {
    id: text(row, "id"),
    productId: text(row, "product_id"),
    version: number(row, "version"),
    status: text(row, "status") as PriceTable["status"],
    validFrom: nullableText(row, "valid_from"),
    validUntil: nullableText(row, "valid_until"),
    createdAt: text(row, "created_at"),
    publishedAt: nullableText(row, "published_at"),
    tiers,
  };
}

export function mapOrder(row: SqlRow): Order {
  return {
    id: text(row, "id"),
    code: text(row, "code"),
    productId: text(row, "product_id"),
    customerName: text(row, "customer_name"),
    customerEmail: text(row, "customer_email"),
    quantityMeters: number(row, "quantity_meters"),
    priceSnapshot: json(row, "price_snapshot_json"),
    paymentStatus: text(row, "payment_status") as Order["paymentStatus"],
    artworkStatus: text(row, "artwork_status") as Order["artworkStatus"],
    productionStatus: text(
      row,
      "production_status",
    ) as Order["productionStatus"],
    fulfillmentStatus: text(
      row,
      "fulfillment_status",
    ) as Order["fulfillmentStatus"],
    fulfillmentMethod: text(
      row,
      "fulfillment_method",
    ) as Order["fulfillmentMethod"],
    productionReadyAt: nullableText(row, "production_ready_at"),
    manualLeadTimeNote: nullableText(row, "manual_lead_time_note"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export function mapOrderEvent(row: SqlRow): OrderEvent {
  return {
    id: text(row, "id"),
    orderId: text(row, "order_id"),
    type: text(row, "type"),
    description: text(row, "description"),
    metadata: json(row, "metadata_json"),
    createdAt: text(row, "created_at"),
  };
}

export function mapOrderCustomerData(row: SqlRow): OrderCustomerData {
  return {
    orderId: text(row, "order_id"),
    contact: json(row, "contact_json"),
    fulfillment: json(row, "fulfillment_json"),
    fiscal: json(row, "fiscal_json"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export function mapAuditLog(row: SqlRow): AuditLog {
  return {
    id: text(row, "id"),
    actorId: text(row, "actor_id"),
    action: text(row, "action"),
    entityType: text(row, "entity_type"),
    entityId: text(row, "entity_id"),
    before: nullableJson(row, "before_json"),
    after: nullableJson(row, "after_json"),
    createdAt: text(row, "created_at"),
  };
}

export function mapPaymentAttempt(row: SqlRow): PaymentAttempt {
  return {
    id: text(row, "id"),
    orderId: text(row, "order_id"),
    provider: text(row, "provider"),
    providerReference: text(row, "provider_reference"),
    idempotencyKey: text(row, "idempotency_key"),
    amountCents: number(row, "amount_cents"),
    currency: "BRL",
    status: text(row, "status") as PaymentAttempt["status"],
    expiresAt: nullableText(row, "expires_at"),
    metadata: json(row, "metadata_json"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export function mapArtworkVersion(row: SqlRow): ArtworkVersion {
  return {
    id: text(row, "id"),
    orderId: text(row, "order_id"),
    version: number(row, "version"),
    storageKey: text(row, "storage_key"),
    originalFilename: text(row, "original_filename"),
    mimeType: text(row, "mime_type"),
    sizeBytes: number(row, "size_bytes"),
    checksumSha256: text(row, "checksum_sha256"),
    scanStatus: text(row, "scan_status") as ArtworkVersion["scanStatus"],
    preflightStatus: text(
      row,
      "preflight_status",
    ) as ArtworkVersion["preflightStatus"],
    reviewStatus: text(row, "review_status") as ArtworkVersion["reviewStatus"],
    reviewNote: nullableText(row, "review_note"),
    reviewedBy: nullableText(row, "reviewed_by"),
    reviewedAt: nullableText(row, "reviewed_at"),
    uploadedBy: text(row, "uploaded_by"),
    metadata: json(row, "metadata_json"),
    createdAt: text(row, "created_at"),
  };
}

export function mapFiscalDocument(row: SqlRow): FiscalDocument {
  return {
    id: text(row, "id"),
    orderId: text(row, "order_id"),
    type: text(row, "document_type") as FiscalDocument["type"],
    version: number(row, "version"),
    storageKey: text(row, "storage_key"),
    originalFilename: text(row, "original_filename"),
    mimeType: text(row, "mime_type"),
    sizeBytes: number(row, "size_bytes"),
    isCurrent: boolean(row, "is_current"),
    uploadedBy: text(row, "uploaded_by"),
    metadata: json(row, "metadata_json"),
    createdAt: text(row, "created_at"),
  };
}
