import { validatePriceTiers } from "./pricing";
import type { DtfProductAggregate } from "./types";

export type PublicationIssueCode =
  | "PRODUCT_ARCHIVED"
  | "MISSING_IMAGE"
  | "MISSING_SEO"
  | "INVALID_QUANTITY_RULE"
  | "MISSING_PRINTABLE_WIDTH"
  | "MISSING_FILE_POLICY"
  | "UNCONFIRMED_FILE_POLICY"
  | "MISSING_PAYMENT_METHOD"
  | "MISSING_FULFILLMENT"
  | "MISSING_PRODUCTION_POLICY"
  | "MISSING_PRICE_TABLE"
  | "INVALID_PRICE_TABLE"
  | "UNCONFIRMED_TECHNICAL_CLAIMS"
  | "PRICE_CURVE_BREAK";

export type PublicationIssue = {
  code: PublicationIssueCode;
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
};

export type PublicationChecklist = {
  canPublish: boolean;
  errors: PublicationIssue[];
  warnings: PublicationIssue[];
};

export function validateDtfProductForPublication(
  aggregate: DtfProductAggregate,
): PublicationChecklist {
  const issues: PublicationIssue[] = [];
  const { product, configuration, filePolicy, productionPolicy } = aggregate;

  const error = (
    code: PublicationIssueCode,
    field: string,
    message: string,
  ) => issues.push({ code, field, message, severity: "ERROR" });
  const warning = (
    code: PublicationIssueCode,
    field: string,
    message: string,
  ) => issues.push({ code, field, message, severity: "WARNING" });

  if (product.status === "ARCHIVED") {
    error("PRODUCT_ARCHIVED", "status", "Um produto arquivado não pode ser publicado.");
  }

  const mainMedia = product.gallery.find(
    (media) => media.url === product.mainImageUrl,
  );
  if (!product.mainImageUrl?.trim() || !mainMedia?.alt.trim()) {
    error(
      "MISSING_IMAGE",
      "mainImageUrl",
      "Adicione uma imagem principal com texto alternativo.",
    );
  }

  if (
    !product.seo.title.trim() ||
    !product.seo.description.trim() ||
    !product.seo.canonicalPath.trim()
  ) {
    error("MISSING_SEO", "seo", "Preencha título, descrição e URL canônica de SEO.");
  }

  if (
    !Number.isInteger(configuration.minimumMeters) ||
    configuration.minimumMeters < 1 ||
    !Number.isInteger(configuration.meterIncrement) ||
    configuration.meterIncrement < 1
  ) {
    error(
      "INVALID_QUANTITY_RULE",
      "configuration",
      "Informe quantidade mínima e incremento inteiros maiores que zero.",
    );
  }

  if (!configuration.printableWidthCm || configuration.printableWidthCm <= 0) {
    error(
      "MISSING_PRINTABLE_WIDTH",
      "printableWidthCm",
      "Confirme a largura útil de impressão.",
    );
  }

  if (!filePolicy) {
    error("MISSING_FILE_POLICY", "filePolicy", "Cadastre a política de arquivos.");
  } else if (
    !filePolicy.confirmed ||
    filePolicy.acceptedExtensions.length === 0 ||
    !filePolicy.maximumFileSizeMb
  ) {
    error(
      "UNCONFIRMED_FILE_POLICY",
      "filePolicy",
      "Confirme formatos aceitos e tamanho máximo do arquivo.",
    );
  }

  if (
    configuration.paymentMethods.length !== 1 ||
    configuration.paymentMethods[0] !== "PIX" ||
    !product.paymentMethods.includes("PIX")
  ) {
    error(
      "MISSING_PAYMENT_METHOD",
      "paymentMethods",
      "Produtos DTF por metro devem aceitar exclusivamente Pix.",
    );
  }

  if (configuration.fulfillmentOptions.length === 0) {
    error(
      "MISSING_FULFILLMENT",
      "fulfillmentOptions",
      "Habilite retirada ou entrega.",
    );
  }

  if (!productionPolicy) {
    error(
      "MISSING_PRODUCTION_POLICY",
      "productionPolicy",
      "Cadastre a política de produção.",
    );
  }

  const publishedTable = aggregate.priceTables.find(
    (table) => table.status === "PUBLISHED",
  );
  if (!publishedTable) {
    error(
      "MISSING_PRICE_TABLE",
      "priceTables",
      "Publique uma tabela de preços antes do produto.",
    );
  } else {
    const tableErrors = validatePriceTiers(
      publishedTable.tiers,
      configuration.minimumMeters,
    );
    if (tableErrors.length > 0) {
      error(
        "INVALID_PRICE_TABLE",
        "priceTables",
        tableErrors.join(" "),
      );
    }

    const tiers = [...publishedTable.tiers].sort(
      (left, right) => left.minimumMeters - right.minimumMeters,
    );
    const hasCurveBreak = tiers.some((tier, index) => {
      const next = tiers[index + 1];
      if (!next || tier.maximumExclusiveMeters === null) return false;
      const previousQuantity = tier.maximumExclusiveMeters - 1;
      return (
        next.minimumMeters * next.unitPriceCents <
        previousQuantity * tier.unitPriceCents
      );
    });
    if (hasCurveBreak) {
      warning(
        "PRICE_CURVE_BREAK",
        "priceTables",
        "A tabela possui uma faixa superior cujo total pode ser menor. Confirme a comunicação na calculadora.",
      );
    }
  }

  if (
    aggregate.specifications.some(
      (specification) => specification.visible && !specification.confirmed,
    )
  ) {
    error(
      "UNCONFIRMED_TECHNICAL_CLAIMS",
      "specifications",
      "Confirme todas as alegações técnicas visíveis antes de publicar.",
    );
  }

  const errors = issues.filter((issue) => issue.severity === "ERROR");
  return {
    canPublish: errors.length === 0,
    errors,
    warnings: issues.filter((issue) => issue.severity === "WARNING"),
  };
}

export class PublicationValidationError extends Error {
  constructor(public readonly checklist: PublicationChecklist) {
    super(checklist.errors.map((issue) => issue.message).join(" "));
    this.name = "PublicationValidationError";
  }
}
