import type Database from "better-sqlite3";

import {
  calculateVolumeTotalPrice,
  PublicationValidationError,
  validateDtfProductForPublication,
  validatePriceTiers,
  type CreateDtfProductInput,
  type DtfProductAggregate,
  type DuplicateProductInput,
  type FilePolicy,
  type PriceQuote,
  type PriceTable,
  type PriceTier,
  type Product,
  type ProductSpecification,
  type ProductStatus,
  type ProductType,
  type ProductionEquipment,
} from "@/domain";

import {
  mapDtfConfiguration,
  mapEquipment,
  mapFilePolicy,
  mapPriceTable,
  mapPriceTier,
  mapProduct,
  mapProductionPolicy,
  mapSpecification,
} from "./mappers";
import { asRow, asRows, domainId, nowIso, writeAudit } from "./repository-helpers";

export type ProductListFilters = {
  status?: ProductStatus;
  type?: ProductType;
  search?: string;
};

export type ProductPaymentPolicy = {
  productId: string;
  pixExpirationMinutes: number;
  refundPolicy: string;
};

export type CreatePriceTableVersionOptions = {
  actorId?: string;
  validFrom?: string | null;
};

export type PublishPriceTableOptions = {
  actorId?: string;
  validFrom?: string | null;
};

function normalizeOptionalDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Informe uma data de vigência válida.");
  }
  return date.toISOString();
}

function assertPublicPath(value: string, label: string): void {
  if (!/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} deve ser um caminho público em letras minúsculas.`);
  }
}

function assertMediaUrl(value: string | null, label: string): void {
  if (!value) return;
  if (/^\/images\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) && !value.includes("..")) {
    return;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} deve usar /images/arquivo ou uma URL HTTPS permitida.`);
  }
  const allowedHosts = new Set(
    (process.env.MEDIA_HOSTS ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`${label} usa um domínio que não está em MEDIA_HOSTS.`);
  }
}

function assertProductPresentation(input: {
  slug: string;
  mainImageUrl: string | null;
  gallery: Product["gallery"];
  seo: Product["seo"];
}): void {
  assertPublicPath(input.slug, "O slug");
  assertPublicPath(input.seo.canonicalPath, "A URL canônica");
  assertMediaUrl(input.mainImageUrl, "A imagem principal");
  assertMediaUrl(input.seo.socialImageUrl, "A imagem social");
  input.gallery.forEach((media) => assertMediaUrl(media.url, "A imagem da galeria"));
}

export type UpdateProductInput = Partial<
  Pick<
    Product,
    | "name"
    | "slug"
    | "summary"
    | "description"
    | "featured"
    | "displayOrder"
    | "paymentMethods"
    | "fulfillmentOptions"
    | "mainImageUrl"
    | "gallery"
    | "seo"
  >
>;

export class ProductRepository {
  constructor(private readonly db: Database.Database) {}

  list(filters: ProductListFilters = {}): Product[] {
    const clauses: string[] = [];
    const parameters: unknown[] = [];

    if (filters.status) {
      clauses.push("status = ?");
      parameters.push(filters.status);
    }
    if (filters.type) {
      clauses.push("type = ?");
      parameters.push(filters.type);
    }
    if (filters.search?.trim()) {
      clauses.push("(name LIKE ? OR code LIKE ? OR slug LIKE ?)");
      const term = `%${filters.search.trim()}%`;
      parameters.push(term, term, term);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return asRows(
      this.db
        .prepare(
          `SELECT * FROM products ${where}
           ORDER BY display_order ASC, name ASC`,
        )
        .all(...parameters),
    ).map(mapProduct);
  }

  findById(id: string): Product | null {
    const row = asRow(this.db.prepare("SELECT * FROM products WHERE id = ?").get(id));
    return row ? mapProduct(row) : null;
  }

  findBySlug(slug: string): Product | null {
    const row = asRow(
      this.db.prepare("SELECT * FROM products WHERE slug = ?").get(slug),
    );
    return row ? mapProduct(row) : null;
  }

  getPaymentPolicy(productId: string): ProductPaymentPolicy {
    this.requireProduct(productId);
    const row = asRow(
      this.db
        .prepare("SELECT * FROM product_payment_policies WHERE product_id = ?")
        .get(productId),
    );
    return {
      productId,
      pixExpirationMinutes: row ? Number(row.pix_expiration_minutes) : 30,
      refundPolicy: row
        ? String(row.refund_policy)
        : "A política de cancelamento e reembolso ainda precisa de confirmação.",
    };
  }

  updatePaymentPolicy(
    productId: string,
    input: Pick<ProductPaymentPolicy, "pixExpirationMinutes" | "refundPolicy">,
    actorId = "system",
  ): ProductPaymentPolicy {
    const current = this.getPaymentPolicy(productId);
    if (!Number.isInteger(input.pixExpirationMinutes) || input.pixExpirationMinutes < 5) {
      throw new Error("A expiração do Pix precisa ter pelo menos 5 minutos.");
    }
    if (!input.refundPolicy.trim()) {
      throw new Error("A política de cancelamento e reembolso é obrigatória.");
    }
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO product_payment_policies (
             product_id, pix_expiration_minutes, refund_policy, updated_at
           ) VALUES (?, ?, ?, ?)
           ON CONFLICT(product_id) DO UPDATE SET
             pix_expiration_minutes = excluded.pix_expiration_minutes,
             refund_policy = excluded.refund_policy,
             updated_at = excluded.updated_at`,
        )
        .run(
          productId,
          input.pixExpirationMinutes,
          input.refundPolicy.trim(),
          timestamp,
        );
      this.db
        .prepare("UPDATE products SET updated_at = ? WHERE id = ?")
        .run(timestamp, productId);
      writeAudit(this.db, {
        actorId,
        action: "PAYMENT_POLICY_UPDATED",
        entityType: "Product",
        entityId: productId,
        before: current,
        after: input,
      });
    })();
    return this.getPaymentPolicy(productId);
  }

  getDtfAggregate(productId: string): DtfProductAggregate | null {
    const product = this.findById(productId);
    if (!product || product.type !== "DTF_BY_METER") return null;

    const configurationRow = asRow(
      this.db
        .prepare("SELECT * FROM dtf_product_configurations WHERE product_id = ?")
        .get(productId),
    );
    if (!configurationRow) return null;
    const configuration = mapDtfConfiguration(configurationRow);

    const filePolicyRow = asRow(
      this.db
        .prepare("SELECT * FROM file_policies WHERE id = ?")
        .get(configuration.filePolicyId),
    );
    const productionPolicyRow = asRow(
      this.db
        .prepare("SELECT * FROM production_policies WHERE id = ?")
        .get(configuration.productionPolicyId),
    );
    const specifications = asRows(
      this.db
        .prepare(
          `SELECT * FROM product_specifications
           WHERE product_id = ? ORDER BY position ASC`,
        )
        .all(productId),
    ).map(mapSpecification);
    const equipment = asRows(
      this.db
        .prepare(
          `SELECT * FROM production_equipment
           WHERE product_id = ? ORDER BY id ASC`,
        )
        .all(productId),
    ).map(mapEquipment);
    const tableRows = asRows(
      this.db
        .prepare(
          `SELECT * FROM price_tables
           WHERE product_id = ? ORDER BY version DESC`,
        )
        .all(productId),
    );
    const tierStatement = this.db.prepare(
      `SELECT * FROM price_tiers
       WHERE price_table_id = ? ORDER BY position ASC`,
    );
    const priceTables = tableRows.map((row) =>
      mapPriceTable(
        row,
        asRows(tierStatement.all(String(row.id))).map(mapPriceTier),
      ),
    );

    return {
      product,
      configuration,
      filePolicy: filePolicyRow ? mapFilePolicy(filePolicyRow) : null,
      productionPolicy: productionPolicyRow
        ? mapProductionPolicy(productionPolicyRow)
        : null,
      specifications,
      equipment,
      priceTables,
    };
  }

  createDtfProduct(
    input: CreateDtfProductInput,
    actorId = "system",
  ): DtfProductAggregate {
    assertProductPresentation(input.product);
    const timestamp = nowIso();
    const productId = domainId("product");
    const filePolicyId = domainId("file_policy");
    const productionPolicyId = domainId("production_policy");
    const priceTableId = domainId("price_table");
    const priceTableStatus = input.priceTable.status ?? "DRAFT";
    const tiers: PriceTier[] = input.priceTable.tiers.map((tier, index) => ({
      ...tier,
      id: domainId("price_tier"),
      priceTableId,
      position: tier.position ?? index,
    }));
    const priceErrors = validatePriceTiers(
      tiers,
      input.configuration.minimumMeters,
    );
    if (priceErrors.length > 0) {
      throw new Error(priceErrors.join(" "));
    }

    this.db.transaction(() => {
      if (input.product.featured) {
        this.db
          .prepare("UPDATE products SET featured = 0 WHERE type = 'DTF_BY_METER'")
          .run();
      }

      this.db
        .prepare(
          `INSERT INTO products (
            id, code, name, slug, type, summary, description, status,
            featured, display_order, payment_methods_json,
            fulfillment_options_json, main_image_url, gallery_json,
            seo_json, published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'DTF_BY_METER', ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        )
        .run(
          productId,
          input.product.code,
          input.product.name,
          input.product.slug,
          input.product.summary,
          input.product.description,
          input.product.featured ? 1 : 0,
          input.product.displayOrder,
          JSON.stringify(input.product.paymentMethods),
          JSON.stringify(input.product.fulfillmentOptions),
          input.product.mainImageUrl,
          JSON.stringify(input.product.gallery),
          JSON.stringify(input.product.seo),
          timestamp,
          timestamp,
        );

      this.db
        .prepare(
          `INSERT INTO file_policies (
            id, name, accepted_extensions_json, maximum_file_size_mb,
            minimum_resolution_dpi, requires_transparent_background,
            color_policy, preparation_guide, confirmed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          filePolicyId,
          input.filePolicy.name,
          JSON.stringify(input.filePolicy.acceptedExtensions),
          input.filePolicy.maximumFileSizeMb,
          input.filePolicy.minimumResolutionDpi,
          input.filePolicy.requiresTransparentBackground ? 1 : 0,
          input.filePolicy.colorPolicy,
          input.filePolicy.preparationGuide,
          input.filePolicy.confirmed ? 1 : 0,
        );

      this.db
        .prepare(
          `INSERT INTO production_policies (
            id, start_trigger, standard_start_within_business_hours,
            custom_lead_time_above_meters, large_order_mode
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          productionPolicyId,
          input.productionPolicy.startTrigger,
          input.productionPolicy.standardStartWithinBusinessHours,
          input.productionPolicy.customLeadTimeAboveMeters,
          input.productionPolicy.largeOrderMode,
        );

      this.db
        .prepare(
          `INSERT INTO dtf_product_configurations (
            product_id, minimum_meters, meter_increment, pricing_mode,
            payment_methods_json, printable_width_cm, file_policy_id,
            production_policy_id, fulfillment_options_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          productId,
          input.configuration.minimumMeters,
          input.configuration.meterIncrement,
          input.configuration.pricingMode,
          JSON.stringify(input.configuration.paymentMethods),
          input.configuration.printableWidthCm,
          filePolicyId,
          productionPolicyId,
          JSON.stringify(input.configuration.fulfillmentOptions),
        );

      const insertSpecification = this.db.prepare(
        `INSERT INTO product_specifications (
          id, product_id, group_name, title, description,
          position, visible, confirmed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      input.specifications.forEach((specification) => {
        insertSpecification.run(
          domainId("specification"),
          productId,
          specification.group,
          specification.title,
          specification.description,
          specification.position,
          specification.visible ? 1 : 0,
          specification.confirmed ? 1 : 0,
        );
      });

      const insertEquipment = this.db.prepare(
        `INSERT INTO production_equipment (
          id, product_id, name, quantity,
          unit_capacity_meters_per_hour, active
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      );
      input.equipment.forEach((equipment) => {
        insertEquipment.run(
          domainId("equipment"),
          productId,
          equipment.name,
          equipment.quantity,
          equipment.unitCapacityMetersPerHour,
          equipment.active ? 1 : 0,
        );
      });

      this.db
        .prepare(
          `INSERT INTO price_tables (
            id, product_id, version, status, valid_from, valid_until,
            created_at, published_at
          ) VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
        )
        .run(
          priceTableId,
          productId,
          priceTableStatus,
          input.priceTable.validFrom,
          input.priceTable.validUntil,
          timestamp,
          priceTableStatus === "PUBLISHED" ? timestamp : null,
        );
      this.insertTiers(tiers);

      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: productId,
        after: { code: input.product.code, name: input.product.name },
      });
    })();

    return this.requireAggregate(productId);
  }

  updateProduct(
    productId: string,
    patch: UpdateProductInput,
    actorId = "system",
  ): Product {
    const current = this.requireProduct(productId);
    if (current.status === "ARCHIVED") {
      throw new Error("Um produto arquivado não pode ser editado.");
    }

    const updated: Product = {
      ...current,
      ...patch,
      seo: patch.seo ?? current.seo,
      gallery: patch.gallery ?? current.gallery,
      updatedAt: nowIso(),
    };
    assertProductPresentation(updated);

    this.db.transaction(() => {
      if (updated.featured && !current.featured) {
        this.db
          .prepare(
            "UPDATE products SET featured = 0 WHERE type = 'DTF_BY_METER' AND id <> ?",
          )
          .run(productId);
      }
      this.db
        .prepare(
          `UPDATE products SET
            name = ?, slug = ?, summary = ?, description = ?, featured = ?,
            display_order = ?, payment_methods_json = ?,
            fulfillment_options_json = ?, main_image_url = ?, gallery_json = ?,
            seo_json = ?, updated_at = ?
          WHERE id = ?`,
        )
        .run(
          updated.name,
          updated.slug,
          updated.summary,
          updated.description,
          updated.featured ? 1 : 0,
          updated.displayOrder,
          JSON.stringify(updated.paymentMethods),
          JSON.stringify(updated.fulfillmentOptions),
          updated.mainImageUrl,
          JSON.stringify(updated.gallery),
          JSON.stringify(updated.seo),
          updated.updatedAt,
          productId,
        );
      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: productId,
        before: { name: current.name, slug: current.slug, status: current.status },
        after: { name: updated.name, slug: updated.slug, status: updated.status },
      });
    })();

    return this.requireProduct(productId);
  }

  updateDtfConfiguration(
    productId: string,
    input: {
      minimumMeters: number;
      meterIncrement: number;
      printableWidthCm: number | null;
      fulfillmentOptions: Array<"PICKUP" | "SHIPPING">;
    },
    actorId = "system",
  ): DtfProductAggregate {
    const aggregate = this.requireAggregate(productId);
    if (aggregate.product.status === "ARCHIVED") {
      throw new Error("Um produto arquivado não pode ser editado.");
    }
    if (!Number.isInteger(input.minimumMeters) || input.minimumMeters < 1) {
      throw new Error("A quantidade mínima precisa ser um inteiro positivo.");
    }
    if (!Number.isInteger(input.meterIncrement) || input.meterIncrement < 1) {
      throw new Error("O incremento precisa ser um inteiro positivo.");
    }
    if (input.printableWidthCm !== null && input.printableWidthCm <= 0) {
      throw new Error("A largura útil precisa ser positiva.");
    }
    if (input.fulfillmentOptions.length === 0) {
      throw new Error("Habilite retirada ou entrega.");
    }

    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE dtf_product_configurations
           SET minimum_meters = ?, meter_increment = ?, printable_width_cm = ?,
               fulfillment_options_json = ?
           WHERE product_id = ?`,
        )
        .run(
          input.minimumMeters,
          input.meterIncrement,
          input.printableWidthCm,
          JSON.stringify(input.fulfillmentOptions),
          productId,
        );
      this.db
        .prepare(
          `UPDATE products
           SET fulfillment_options_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(JSON.stringify(input.fulfillmentOptions), timestamp, productId);
      writeAudit(this.db, {
        actorId,
        action: "DTF_CONFIGURATION_UPDATED",
        entityType: "Product",
        entityId: productId,
        before: {
          minimumMeters: aggregate.configuration.minimumMeters,
          meterIncrement: aggregate.configuration.meterIncrement,
          printableWidthCm: aggregate.configuration.printableWidthCm,
          fulfillmentOptions: aggregate.configuration.fulfillmentOptions,
        },
        after: input,
      });
    })();
    return this.requireAggregate(productId);
  }

  updateFilePolicy(
    productId: string,
    input: Omit<FilePolicy, "id" | "name"> & { name?: string },
    actorId = "system",
  ): DtfProductAggregate {
    const aggregate = this.requireAggregate(productId);
    if (!aggregate.filePolicy) throw new Error("Política de arquivo não encontrada.");
    const extensions = Array.from(
      new Set(
        input.acceptedExtensions
          .map((extension) => extension.replace(/^\./, "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    if (extensions.length === 0) throw new Error("Informe ao menos um formato de arquivo.");
    if (
      (process.env.UPLOAD_PROVIDER ?? "local") === "local" &&
      extensions.some((extension) => !["PNG", "PDF", "TIF", "TIFF"].includes(extension))
    ) {
      throw new Error(
        "O armazenamento local de homologação aceita somente PNG, PDF, TIF e TIFF.",
      );
    }
    if (!input.maximumFileSizeMb || input.maximumFileSizeMb < 1) {
      throw new Error("Informe um tamanho máximo de arquivo válido.");
    }
    if (!input.minimumResolutionDpi || input.minimumResolutionDpi < 72) {
      throw new Error("Informe uma resolução recomendada de pelo menos 72 DPI.");
    }
    if (!input.colorPolicy.trim() || !input.preparationGuide.trim()) {
      throw new Error("Política de cores e guia de preparação são obrigatórios.");
    }

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE file_policies SET
             name = ?, accepted_extensions_json = ?, maximum_file_size_mb = ?,
             minimum_resolution_dpi = ?, requires_transparent_background = ?,
             color_policy = ?, preparation_guide = ?, confirmed = ?
           WHERE id = ?`,
        )
        .run(
          input.name ?? aggregate.filePolicy!.name,
          JSON.stringify(extensions),
          input.maximumFileSizeMb,
          input.minimumResolutionDpi,
          input.requiresTransparentBackground ? 1 : 0,
          input.colorPolicy.trim(),
          input.preparationGuide.trim(),
          input.confirmed ? 1 : 0,
          aggregate.filePolicy!.id,
        );
      this.db
        .prepare("UPDATE products SET updated_at = ? WHERE id = ?")
        .run(nowIso(), productId);
      writeAudit(this.db, {
        actorId,
        action: "FILE_POLICY_UPDATED",
        entityType: "FilePolicy",
        entityId: aggregate.filePolicy!.id,
        before: {
          acceptedExtensions: aggregate.filePolicy!.acceptedExtensions,
          confirmed: aggregate.filePolicy!.confirmed,
        },
        after: { acceptedExtensions: extensions, confirmed: input.confirmed },
      });
    })();
    return this.requireAggregate(productId);
  }

  replaceSpecifications(
    productId: string,
    input: Array<
      Pick<
        ProductSpecification,
        "group" | "title" | "description" | "position" | "visible" | "confirmed"
      >
    >,
    actorId = "system",
  ): DtfProductAggregate {
    const aggregate = this.requireAggregate(productId);
    if (input.length === 0) throw new Error("Cadastre ao menos uma especificação.");
    input.forEach((item) => {
      if (!item.group.trim() || !item.title.trim() || !item.description.trim()) {
        throw new Error("Grupo, título e descrição são obrigatórios nas especificações.");
      }
    });

    this.db.transaction(() => {
      this.db.prepare("DELETE FROM product_specifications WHERE product_id = ?").run(productId);
      const insert = this.db.prepare(
        `INSERT INTO product_specifications (
          id, product_id, group_name, title, description, position, visible, confirmed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      input.forEach((item, index) =>
        insert.run(
          domainId("specification"),
          productId,
          item.group.trim(),
          item.title.trim(),
          item.description.trim(),
          index,
          item.visible ? 1 : 0,
          item.confirmed ? 1 : 0,
        ),
      );
      this.db
        .prepare("UPDATE products SET updated_at = ? WHERE id = ?")
        .run(nowIso(), productId);
      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_SPECIFICATIONS_REPLACED",
        entityType: "Product",
        entityId: productId,
        before: { count: aggregate.specifications.length },
        after: {
          count: input.length,
          confirmedCount: input.filter((item) => item.confirmed).length,
        },
      });
    })();
    return this.requireAggregate(productId);
  }

  replaceProductionSettings(
    productId: string,
    input: {
      equipment: Array<
        Pick<ProductionEquipment, "name" | "quantity" | "unitCapacityMetersPerHour">
      >;
      standardStartWithinBusinessHours: number;
      customLeadTimeAboveMeters: number;
      fulfillmentOptions: Array<"PICKUP" | "SHIPPING">;
    },
    actorId = "system",
  ): DtfProductAggregate {
    const aggregate = this.requireAggregate(productId);
    if (!aggregate.productionPolicy) throw new Error("Política de produção não encontrada.");
    if (input.equipment.length === 0) throw new Error("Cadastre ao menos um equipamento.");
    if (input.fulfillmentOptions.length === 0) {
      throw new Error("Habilite retirada ou entrega.");
    }
    input.equipment.forEach((equipment) => {
      if (
        !equipment.name.trim() ||
        !Number.isInteger(equipment.quantity) ||
        equipment.quantity < 1 ||
        equipment.unitCapacityMetersPerHour <= 0
      ) {
        throw new Error("Revise nome, quantidade e capacidade dos equipamentos.");
      }
    });
    if (
      !Number.isInteger(input.standardStartWithinBusinessHours) ||
      input.standardStartWithinBusinessHours < 1 ||
      !Number.isInteger(input.customLeadTimeAboveMeters) ||
      input.customLeadTimeAboveMeters < 1
    ) {
      throw new Error("Os limites da política de produção precisam ser inteiros positivos.");
    }

    this.db.transaction(() => {
      this.db.prepare("DELETE FROM production_equipment WHERE product_id = ?").run(productId);
      const insert = this.db.prepare(
        `INSERT INTO production_equipment (
           id, product_id, name, quantity, unit_capacity_meters_per_hour, active
         ) VALUES (?, ?, ?, ?, ?, 1)`,
      );
      input.equipment.forEach((equipment) =>
        insert.run(
          domainId("equipment"),
          productId,
          equipment.name.trim(),
          equipment.quantity,
          equipment.unitCapacityMetersPerHour,
        ),
      );
      this.db
        .prepare(
          `UPDATE production_policies SET
             standard_start_within_business_hours = ?,
             custom_lead_time_above_meters = ?
           WHERE id = ?`,
        )
        .run(
          input.standardStartWithinBusinessHours,
          input.customLeadTimeAboveMeters,
          aggregate.productionPolicy!.id,
        );
      this.db
        .prepare(
          `UPDATE dtf_product_configurations
           SET fulfillment_options_json = ? WHERE product_id = ?`,
        )
        .run(JSON.stringify(input.fulfillmentOptions), productId);
      this.db
        .prepare(
          `UPDATE products SET fulfillment_options_json = ?, updated_at = ? WHERE id = ?`,
        )
        .run(JSON.stringify(input.fulfillmentOptions), nowIso(), productId);
      writeAudit(this.db, {
        actorId,
        action: "PRODUCTION_SETTINGS_REPLACED",
        entityType: "Product",
        entityId: productId,
        before: { equipmentCount: aggregate.equipment.length },
        after: {
          equipmentCount: input.equipment.length,
          standardStartWithinBusinessHours: input.standardStartWithinBusinessHours,
          customLeadTimeAboveMeters: input.customLeadTimeAboveMeters,
        },
      });
    })();
    return this.requireAggregate(productId);
  }

  duplicateProduct(
    productId: string,
    input: DuplicateProductInput,
    actorId = "system",
  ): DtfProductAggregate {
    const source = this.requireAggregate(productId);
    if (!source.filePolicy || !source.productionPolicy) {
      throw new Error("O produto original está incompleto e não pode ser duplicado.");
    }
    const latestPriceTable = source.priceTables[0];
    if (!latestPriceTable) {
      throw new Error("O produto original não possui tabela de preços.");
    }

    const created = this.createDtfProduct(
      {
        product: {
          code: input.code,
          name: input.name,
          slug: input.slug,
          summary: source.product.summary,
          description: source.product.description,
          featured: input.featured ?? false,
          displayOrder: source.product.displayOrder,
          paymentMethods: source.product.paymentMethods,
          fulfillmentOptions: source.product.fulfillmentOptions,
          mainImageUrl: source.product.mainImageUrl,
          gallery: source.product.gallery.map((media) => ({
            ...media,
            id: domainId("media"),
          })),
          seo: {
            ...source.product.seo,
            title: input.name,
            canonicalPath: input.slug,
          },
        },
        configuration: {
          minimumMeters: source.configuration.minimumMeters,
          meterIncrement: source.configuration.meterIncrement,
          pricingMode: "VOLUME_TOTAL",
          paymentMethods: ["PIX"],
          printableWidthCm: source.configuration.printableWidthCm,
          fulfillmentOptions: source.configuration.fulfillmentOptions,
        },
        filePolicy: {
          name: source.filePolicy.name,
          acceptedExtensions: source.filePolicy.acceptedExtensions,
          maximumFileSizeMb: source.filePolicy.maximumFileSizeMb,
          minimumResolutionDpi: source.filePolicy.minimumResolutionDpi,
          requiresTransparentBackground:
            source.filePolicy.requiresTransparentBackground,
          colorPolicy: source.filePolicy.colorPolicy,
          preparationGuide: source.filePolicy.preparationGuide,
          confirmed: source.filePolicy.confirmed,
        },
        productionPolicy: {
          startTrigger: source.productionPolicy.startTrigger,
          standardStartWithinBusinessHours:
            source.productionPolicy.standardStartWithinBusinessHours,
          customLeadTimeAboveMeters:
            source.productionPolicy.customLeadTimeAboveMeters,
          largeOrderMode: source.productionPolicy.largeOrderMode,
        },
        specifications: source.specifications.map((specification) => ({
          group: specification.group,
          title: specification.title,
          description: specification.description,
          position: specification.position,
          visible: specification.visible,
          confirmed: specification.confirmed,
        })),
        equipment: source.equipment.map((equipment) => ({
          name: equipment.name,
          quantity: equipment.quantity,
          unitCapacityMetersPerHour: equipment.unitCapacityMetersPerHour,
          active: equipment.active,
        })),
        priceTable: {
          status: "DRAFT",
          validFrom: null,
          validUntil: null,
          tiers: latestPriceTable.tiers.map((tier) => ({
            minimumMeters: tier.minimumMeters,
            maximumExclusiveMeters: tier.maximumExclusiveMeters,
            unitPriceCents: tier.unitPriceCents,
            position: tier.position,
          })),
        },
      },
      actorId,
    );

    writeAudit(this.db, {
      actorId,
      action: "PRODUCT_DUPLICATED",
      entityType: "Product",
      entityId: created.product.id,
      before: { sourceProductId: productId },
      after: { code: created.product.code },
    });
    return created;
  }

  archiveProduct(productId: string, actorId = "system"): Product {
    const current = this.requireProduct(productId);
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE products
           SET status = 'ARCHIVED', featured = 0, updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, productId);
      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_ARCHIVED",
        entityType: "Product",
        entityId: productId,
        before: { status: current.status },
        after: { status: "ARCHIVED" },
      });
    })();
    return this.requireProduct(productId);
  }

  publishProduct(productId: string, actorId = "system"): Product {
    const aggregate = this.requireAggregate(productId);
    const checklist = validateDtfProductForPublication(aggregate);
    if (!checklist.canPublish) {
      throw new PublicationValidationError(checklist);
    }

    const timestamp = nowIso();
    this.db.transaction(() => {
      if (aggregate.product.featured) {
        this.db
          .prepare(
            `UPDATE products
             SET featured = 0, updated_at = ?
             WHERE type = 'DTF_BY_METER' AND id <> ?`,
          )
          .run(timestamp, productId);
      }
      this.db
        .prepare(
          `UPDATE products
           SET status = 'PUBLISHED', published_at = COALESCE(published_at, ?),
               updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, timestamp, productId);
      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_PUBLISHED",
        entityType: "Product",
        entityId: productId,
        before: { status: aggregate.product.status },
        after: { status: "PUBLISHED", warnings: checklist.warnings.map((item) => item.code) },
      });
    })();
    return this.requireProduct(productId);
  }

  createPriceTableVersion(
    productId: string,
    tiersInput: Array<
      Pick<PriceTier, "minimumMeters" | "maximumExclusiveMeters" | "unitPriceCents"> &
        Partial<Pick<PriceTier, "position">>
    >,
    options: CreatePriceTableVersionOptions = {},
  ): PriceTable {
    const aggregate = this.requireAggregate(productId);
    const nextVersion = Math.max(0, ...aggregate.priceTables.map((table) => table.version)) + 1;
    const tableId = domainId("price_table");
    const timestamp = nowIso();
    const validFrom = normalizeOptionalDate(options.validFrom);
    const actorId = options.actorId ?? "system";
    const tiers = tiersInput.map((tier, index) => ({
      id: domainId("price_tier"),
      priceTableId: tableId,
      minimumMeters: tier.minimumMeters,
      maximumExclusiveMeters: tier.maximumExclusiveMeters,
      unitPriceCents: tier.unitPriceCents,
      position: tier.position ?? index,
    }));
    const errors = validatePriceTiers(tiers, aggregate.configuration.minimumMeters);
    if (errors.length > 0) throw new Error(errors.join(" "));

    this.db.transaction(() => {
      const previousDrafts = asRows(
        this.db
          .prepare(
            `SELECT id, version FROM price_tables
             WHERE product_id = ? AND status = 'DRAFT'`,
          )
          .all(productId),
      );

      previousDrafts.forEach((draft) => {
        const draftId = String(draft.id);
        const hasOrderSnapshot = Boolean(
          this.db
            .prepare(
              `SELECT 1 FROM orders
               WHERE json_extract(price_snapshot_json, '$.priceTableId') = ?
               LIMIT 1`,
            )
            .get(draftId),
        );

        if (hasOrderSnapshot) {
          this.db
            .prepare(
              `UPDATE price_tables
               SET status = 'ARCHIVED', valid_until = COALESCE(valid_until, valid_from, ?)
               WHERE id = ?`,
            )
            .run(timestamp, draftId);
          return;
        }

        this.db.prepare("DELETE FROM price_tables WHERE id = ?").run(draftId);
      });

      this.db
        .prepare(
          `INSERT INTO price_tables (
            id, product_id, version, status, valid_from, valid_until,
            created_at, published_at
          ) VALUES (?, ?, ?, 'DRAFT', ?, NULL, ?, NULL)`,
        )
        .run(tableId, productId, nextVersion, validFrom, timestamp);
      this.insertTiers(tiers);
      writeAudit(this.db, {
        actorId,
        action: "PRICE_TABLE_VERSION_CREATED",
        entityType: "PriceTable",
        entityId: tableId,
        before: previousDrafts.length
          ? { replacedDraftIds: previousDrafts.map((draft) => String(draft.id)) }
          : null,
        after: { productId, version: nextVersion, validFrom },
      });
    })();
    return this.requirePriceTable(tableId);
  }

  publishPriceTable(
    priceTableId: string,
    options: PublishPriceTableOptions = {},
  ): PriceTable {
    const table = this.requirePriceTable(priceTableId);
    if (table.status !== "DRAFT") {
      throw new Error("Somente uma tabela em rascunho pode ser publicada.");
    }
    const aggregate = this.requireAggregate(table.productId);
    const errors = validatePriceTiers(table.tiers, aggregate.configuration.minimumMeters);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const timestamp = nowIso();
    const requestedValidFrom = Object.hasOwn(options, "validFrom")
      ? options.validFrom
      : table.validFrom;
    const validFrom = normalizeOptionalDate(requestedValidFrom) ?? timestamp;
    const actorId = options.actorId ?? "system";
    const isScheduled = validFrom > timestamp;
    const publishedTables = aggregate.priceTables.filter(
      (candidate) => candidate.status === "PUBLISHED",
    );
    const currentTable = publishedTables.find(
      (candidate) =>
        (!candidate.validFrom || candidate.validFrom <= timestamp) &&
        (!candidate.validUntil || candidate.validUntil > timestamp),
    );

    if (isScheduled && !currentTable) {
      throw new Error(
        "Não é possível agendar uma tabela sem manter outra tabela vigente até a nova data.",
      );
    }

    this.db.transaction(() => {
      publishedTables.forEach((publishedTable) => {
        if (isScheduled && publishedTable.id === currentTable?.id) {
          this.db
            .prepare("UPDATE price_tables SET valid_until = ? WHERE id = ?")
            .run(validFrom, publishedTable.id);
          return;
        }

        let validUntil = publishedTable.validUntil;
        if (!validUntil) {
          validUntil =
            publishedTable.validFrom && publishedTable.validFrom > timestamp
              ? publishedTable.validFrom
              : validFrom;
        } else if (!isScheduled && validUntil > validFrom) {
          validUntil = validFrom;
        }

        this.db
          .prepare(
            `UPDATE price_tables
             SET status = 'ARCHIVED', valid_until = ?
             WHERE id = ?`,
          )
          .run(validUntil, publishedTable.id);
      });

      this.db
        .prepare(
          `UPDATE price_tables
           SET status = 'PUBLISHED', valid_from = ?, valid_until = NULL,
               published_at = ?
           WHERE id = ?`,
        )
        .run(validFrom, timestamp, priceTableId);
      writeAudit(this.db, {
        actorId,
        action: "PRICE_TABLE_PUBLISHED",
        entityType: "PriceTable",
        entityId: priceTableId,
        before: { status: table.status },
        after: { status: "PUBLISHED", validFrom, scheduled: isScheduled },
      });
    })();
    return this.requirePriceTable(priceTableId);
  }

  calculatePrice(productId: string, meters: number, at = nowIso()): PriceQuote {
    const aggregate = this.requireAggregate(productId);
    const activeTable = aggregate.priceTables.find(
      (table) =>
        table.status === "PUBLISHED" &&
        (!table.validFrom || table.validFrom <= at) &&
        (!table.validUntil || table.validUntil > at),
    );
    if (!activeTable) throw new Error("O produto não possui tabela de preços ativa.");
    return calculateVolumeTotalPrice(meters, aggregate.configuration, activeTable);
  }

  private insertTiers(tiers: PriceTier[]): void {
    const statement = this.db.prepare(
      `INSERT INTO price_tiers (
        id, price_table_id, minimum_meters, maximum_exclusive_meters,
        unit_price_cents, position
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    tiers.forEach((tier) =>
      statement.run(
        tier.id,
        tier.priceTableId,
        tier.minimumMeters,
        tier.maximumExclusiveMeters,
        tier.unitPriceCents,
        tier.position,
      ),
    );
  }

  private requirePriceTable(priceTableId: string): PriceTable {
    const row = asRow(
      this.db.prepare("SELECT * FROM price_tables WHERE id = ?").get(priceTableId),
    );
    if (!row) throw new Error("Tabela de preços não encontrada.");
    const tiers = asRows(
      this.db
        .prepare(
          "SELECT * FROM price_tiers WHERE price_table_id = ? ORDER BY position ASC",
        )
        .all(priceTableId),
    ).map(mapPriceTier);
    return mapPriceTable(row, tiers);
  }

  private requireProduct(productId: string): Product {
    const product = this.findById(productId);
    if (!product) throw new Error("Produto não encontrado.");
    return product;
  }

  private requireAggregate(productId: string): DtfProductAggregate {
    const aggregate = this.getDtfAggregate(productId);
    if (!aggregate) throw new Error("Produto DTF não encontrado.");
    return aggregate;
  }
}
