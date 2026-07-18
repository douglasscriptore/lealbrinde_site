export type CheckoutFulfillmentMethod = "PICKUP" | "SHIPPING";
export type FiscalPersonType = "PF" | "PJ";

export type CheckoutAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type CreateDtfOrderRequest = {
  productId: string;
  priceTableId: string;
  quantityMeters: number;
  artworkAssetId: string;
  fulfillment: {
    method: CheckoutFulfillmentMethod;
    address: CheckoutAddress | null;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  fiscal: {
    issueInvoice: boolean;
    personType: FiscalPersonType | null;
    copyContactData: boolean;
    legalName: string | null;
    document: string | null;
    stateRegistration: string | null;
    email: string | null;
    phone: string | null;
  };
  acceptedTerms: boolean;
};

export type CheckoutPaymentStatus =
  | "PENDING_PIX"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED";

export type CheckoutPixPayment = {
  externalId: string;
  externalReference: string;
  amountMinor: number;
  status: CheckoutPaymentStatus;
  copyPasteCode: string;
  qrCodeBase64: string | null;
  expiresAt: string;
  provider: string;
  sandbox: boolean;
};

export type VerificationRequiredOrderResponse = {
  status: "verification_required";
  orderCode: string;
  message?: string;
};

export type PaymentCreatedOrderResponse = {
  status: "payment_created";
  orderCode: string;
  payment: CheckoutPixPayment;
};

export type CreateDtfOrderResponse =
  | VerificationRequiredOrderResponse
  | PaymentCreatedOrderResponse;

export type CheckoutApiError = {
  error: string;
  fieldErrors?: Record<string, string>;
};

export type UploadedArtworkAsset = {
  assetId: string;
  storageKey: string;
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  detectedType: "PNG" | "PDF" | "TIFF";
  scanStatus: string;
  preflightSeverity: "human_review_required";
};

export type UploadArtworkResponse = {
  asset: UploadedArtworkAsset;
  notice: string;
};

export type CheckoutPriceTier = {
  id: string;
  minimumMeters: number;
  maximumExclusiveMeters: number | null;
  unitPriceCents: number;
};

export type DtfCheckoutProduct = {
  id: string;
  name: string;
  minimumMeters: number;
  meterIncrement: number;
  printableWidthCm: number | null;
  acceptedExtensions: string[];
  maximumFileSizeMb: number | null;
  fulfillmentOptions: CheckoutFulfillmentMethod[];
  standardStartWithinBusinessHours: number;
  customLeadTimeAboveMeters: number;
};

export type DtfCheckoutPriceTable = {
  id: string;
  version: number;
  tiers: CheckoutPriceTier[];
};
