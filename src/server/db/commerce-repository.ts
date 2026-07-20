import type Database from "better-sqlite3";

import {
  assertQuantityRule,
  isVariantAvailable,
  type Cart,
  type CartItem,
  type CartLine,
  type Category,
  type CommerceSettings,
  type CreateStandardProductInput,
  type InventoryMovement,
  type PersonalizationField,
  type ProductOption,
  type ProductVariant,
  type StandardProductAggregate,
  type StandardProductConfiguration,
  type StandardProductPriceQuote,
  type StandardProductSummary,
  type UpdateStandardProductInput,
  type VariantPriceTable,
  type VariantPriceTier,
  validateStandardProductForPublication,
} from "@/domain";

import { mapProduct, type SqlRow } from "./mappers";
import { ProductRepository } from "./product-repository";
import { asRow, asRows, domainId, nowIso, writeAudit } from "./repository-helpers";

type CatalogFilters = {
  search?: string;
  categorySlug?: string;
  availability?: "AVAILABLE";
  minimumPriceCents?: number;
  maximumPriceCents?: number;
  sort?: "FEATURED" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
  limit?: number;
  offset?: number;
};

type UpsertCartItemInput = {
  productId: string;
  variantId: string | null;
  quantity: number;
  customization?: Record<string, string | number>;
  artworkAssetId?: string | null;
};

function text(row: SqlRow, key: string): string {
  return String(row[key]);
}

function nullableText(row: SqlRow, key: string): string | null {
  return row[key] === null || row[key] === undefined ? null : String(row[key]);
}

function number(row: SqlRow, key: string): number {
  return Number(row[key]);
}

function bool(row: SqlRow, key: string): boolean {
  return Number(row[key]) === 1;
}

function json<T>(row: SqlRow, key: string): T {
  return JSON.parse(text(row, key)) as T;
}

function mapCategory(row: SqlRow): Category {
  return {
    id: text(row, "id"),
    parentId: nullableText(row, "parent_id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    description: text(row, "description"),
    imageUrl: nullableText(row, "image_url"),
    seo: json(row, "seo_json"),
    displayOrder: number(row, "display_order"),
    status: text(row, "status") as Category["status"],
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

function mapVariant(row: SqlRow): ProductVariant {
  return {
    id: text(row, "id"),
    productId: text(row, "product_id"),
    sku: text(row, "sku"),
    optionValues: json(row, "option_values_json"),
    basePriceCents: number(row, "base_price_cents"),
    minimumQuantity: number(row, "minimum_quantity"),
    quantityIncrement: number(row, "quantity_increment"),
    stockMode: text(row, "stock_mode") as ProductVariant["stockMode"],
    availableQuantity:
      row.available_quantity === null ? null : number(row, "available_quantity"),
    reservedQuantity: number(row, "reserved_quantity"),
    weightGrams: number(row, "weight_grams"),
    widthCm: number(row, "width_cm"),
    heightCm: number(row, "height_cm"),
    lengthCm: number(row, "length_cm"),
    active: bool(row, "active"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

function mapPersonalizationField(row: SqlRow): PersonalizationField {
  return {
    id: text(row, "id"),
    productId: text(row, "product_id"),
    key: text(row, "field_key"),
    label: text(row, "label"),
    type: text(row, "field_type") as PersonalizationField["type"],
    required: bool(row, "required"),
    options: json(row, "options_json"),
    maximumLength:
      row.maximum_length === null ? null : number(row, "maximum_length"),
    priceAdjustmentCents: number(row, "price_adjustment_cents"),
    position: number(row, "position"),
  };
}

function mapInventoryMovement(row: SqlRow): InventoryMovement {
  return {
    id: text(row, "id"),
    variantId: text(row, "variant_id"),
    variantSku: text(row, "variant_sku"),
    orderId: nullableText(row, "order_id"),
    type: text(row, "movement_type") as InventoryMovement["type"],
    quantity: number(row, "quantity"),
    reason: text(row, "reason"),
    actorId: text(row, "actor_id"),
    createdAt: text(row, "created_at"),
  };
}

function mapVariantTier(row: SqlRow): VariantPriceTier {
  return {
    id: text(row, "id"),
    priceTableId: text(row, "price_table_id"),
    minimumQuantity: number(row, "minimum_quantity"),
    maximumExclusiveQuantity:
      row.maximum_exclusive_quantity === null
        ? null
        : number(row, "maximum_exclusive_quantity"),
    unitPriceCents: number(row, "unit_price_cents"),
    position: number(row, "position"),
  };
}

function mapCartItem(row: SqlRow): CartItem {
  return {
    id: text(row, "id"),
    cartId: text(row, "cart_id"),
    productId: text(row, "product_id"),
    variantId: nullableText(row, "variant_id"),
    quantity: number(row, "quantity"),
    unit: text(row, "unit") as CartItem["unit"],
    customization: json(row, "customization_json"),
    artworkAssetId: nullableText(row, "artwork_asset_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export class CommerceRepository {
  constructor(private readonly db: Database.Database) {}

  getSettings(): CommerceSettings {
    const row = asRow(
      this.db.prepare("SELECT * FROM commerce_settings WHERE id = 'default'").get(),
    );
    if (!row) throw new Error("Configuração comercial não encontrada.");
    return {
      catalogEnabled: bool(row, "catalog_enabled"),
      directCheckoutEnabled: bool(row, "direct_checkout_enabled"),
      cardEnabled: bool(row, "card_enabled"),
      shippingEnabled: bool(row, "shipping_enabled"),
      maxInstallments: number(row, "max_installments"),
      statementDescriptor: text(row, "statement_descriptor"),
      updatedAt: text(row, "updated_at"),
    };
  }

  updateSettings(
    input: Omit<CommerceSettings, "updatedAt">,
    actorId: string,
  ): CommerceSettings {
    if (!Number.isInteger(input.maxInstallments) || input.maxInstallments < 1 || input.maxInstallments > 12) {
      throw new Error("O máximo de parcelas deve ficar entre 1 e 12.");
    }
    if (!/^[A-Z0-9 ]{5,16}$/.test(input.statementDescriptor)) {
      throw new Error("Use de 5 a 16 letras maiúsculas ou números no descritor.");
    }
    const before = this.getSettings();
    const updatedAt = nowIso();
    this.db.transaction(() => {
      this.db.prepare(
        `UPDATE commerce_settings SET
          catalog_enabled = ?, direct_checkout_enabled = ?, card_enabled = ?,
          shipping_enabled = ?, max_installments = ?, statement_descriptor = ?,
          updated_at = ? WHERE id = 'default'`,
      ).run(
        Number(input.catalogEnabled),
        Number(input.directCheckoutEnabled),
        Number(input.cardEnabled),
        Number(input.shippingEnabled),
        input.maxInstallments,
        input.statementDescriptor,
        updatedAt,
      );
      writeAudit(this.db, {
        actorId,
        action: "COMMERCE_SETTINGS_UPDATED",
        entityType: "CommerceSettings",
        entityId: "default",
        before,
        after: input,
      });
    })();
    return this.getSettings();
  }

  listCategories(publishedOnly = false): Category[] {
    return asRows(
      this.db.prepare(
        `SELECT * FROM categories ${publishedOnly ? "WHERE status = 'PUBLISHED'" : ""}
         ORDER BY display_order, name`,
      ).all(),
    ).map(mapCategory);
  }

  findCategoryBySlug(slug: string): Category | null {
    const row = asRow(this.db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug));
    return row ? mapCategory(row) : null;
  }

  createCategory(
    input: Pick<Category, "name" | "slug" | "description" | "imageUrl" | "seo" | "displayOrder"> & {
      parentId?: string | null;
      status?: Category["status"];
    },
    actorId: string,
  ): Category {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      throw new Error("O slug da categoria deve usar letras minúsculas, números e hífens.");
    }
    if (input.parentId) {
      const parent = asRow(this.db.prepare("SELECT parent_id FROM categories WHERE id = ?").get(input.parentId));
      if (!parent) throw new Error("Categoria principal não encontrada.");
      if (parent.parent_id) throw new Error("O catálogo suporta no máximo dois níveis de categoria.");
    }
    const id = domainId("category");
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO categories (
          id, parent_id, name, slug, description, image_url, seo_json,
          display_order, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.parentId ?? null,
        input.name.trim(),
        input.slug,
        input.description.trim(),
        input.imageUrl,
        JSON.stringify(input.seo),
        input.displayOrder,
        input.status ?? "DRAFT",
        timestamp,
        timestamp,
      );
      writeAudit(this.db, {
        actorId,
        action: "CATEGORY_CREATED",
        entityType: "Category",
        entityId: id,
        after: { name: input.name, slug: input.slug },
      });
    })();
    return mapCategory(asRow(this.db.prepare("SELECT * FROM categories WHERE id = ?").get(id))!);
  }

  publishCategory(categoryId: string, actorId: string): Category {
    const row = asRow(this.db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId));
    if (!row) throw new Error("Categoria não encontrada.");
    const current = mapCategory(row);
    if (current.status === "ARCHIVED") {
      throw new Error("Uma categoria arquivada não pode ser publicada.");
    }
    if (current.status === "PUBLISHED") return current;

    const updatedAt = nowIso();
    this.db.transaction(() => {
      this.db.prepare("UPDATE categories SET status = 'PUBLISHED', updated_at = ? WHERE id = ?")
        .run(updatedAt, categoryId);
      writeAudit(this.db, {
        actorId,
        action: "CATEGORY_PUBLISHED",
        entityType: "Category",
        entityId: categoryId,
        before: { status: current.status },
        after: { status: "PUBLISHED" },
      });
    })();

    return mapCategory(asRow(this.db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId))!);
  }

  listCatalog(filters: CatalogFilters = {}): StandardProductSummary[] {
    const clauses = [
      "products.type = 'STANDARD_PRODUCT'",
      "products.status = 'PUBLISHED'",
      `EXISTS (
        SELECT 1 FROM product_categories published_pc
        JOIN categories published_category ON published_category.id = published_pc.category_id
        WHERE published_pc.product_id = products.id AND published_category.status = 'PUBLISHED'
      )`,
    ];
    const parameters: unknown[] = [];
    let searchJoin = "";
    if (filters.search?.trim()) {
      searchJoin = "JOIN product_search ON product_search.product_id = products.id";
      clauses.push("product_search MATCH ?");
      parameters.push(filters.search.trim().split(/\s+/).map((term) => `${term.replace(/[^\p{L}\p{N}-]/gu, "")}*`).join(" "));
    }
    if (filters.categorySlug) {
      clauses.push(`EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = products.id AND c.slug = ? AND c.status = 'PUBLISHED'
      )`);
      parameters.push(filters.categorySlug);
    }
    if (filters.minimumPriceCents !== undefined) {
      clauses.push("variants.minimum_price >= ?");
      parameters.push(filters.minimumPriceCents);
    }
    if (filters.maximumPriceCents !== undefined) {
      clauses.push("variants.minimum_price <= ?");
      parameters.push(filters.maximumPriceCents);
    }
    if (filters.availability === "AVAILABLE") {
      clauses.push("variants.available_count > 0");
    }
    const sort = {
      FEATURED: "products.featured DESC, products.display_order, products.name",
      PRICE_ASC: "variants.minimum_price ASC, products.name",
      PRICE_DESC: "variants.minimum_price DESC, products.name",
      NEWEST: "products.published_at DESC, products.name",
    }[filters.sort ?? "FEATURED"];
    const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60);
    const offset = Math.max(filters.offset ?? 0, 0);
    parameters.push(limit, offset);

    const rows = asRows(this.db.prepare(
      `SELECT products.*,
        variants.minimum_price, variants.maximum_price, variants.available_count,
        variants.made_to_order_count,
        categories.category_id, categories.category_name, categories.category_slug,
        categories.category_description, categories.category_image_url,
        categories.category_seo_json, categories.category_display_order,
        categories.category_status, categories.category_created_at, categories.category_updated_at
       FROM products
       ${searchJoin}
       JOIN (
         SELECT product_id, MIN(base_price_cents) minimum_price,
           MAX(base_price_cents) maximum_price,
           SUM(CASE WHEN active = 1 AND (stock_mode = 'MADE_TO_ORDER' OR available_quantity - reserved_quantity > 0) THEN 1 ELSE 0 END) available_count,
           SUM(CASE WHEN active = 1 AND stock_mode = 'MADE_TO_ORDER' THEN 1 ELSE 0 END) made_to_order_count
         FROM product_variants GROUP BY product_id
       ) variants ON variants.product_id = products.id
       LEFT JOIN (
         SELECT pc.product_id, c.id category_id, c.name category_name, c.slug category_slug,
           c.description category_description, c.image_url category_image_url,
           c.seo_json category_seo_json, c.display_order category_display_order,
           c.status category_status, c.created_at category_created_at,
           c.updated_at category_updated_at
         FROM product_categories pc JOIN categories c ON c.id = pc.category_id
         WHERE pc.is_primary = 1
       ) categories ON categories.product_id = products.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sort} LIMIT ? OFFSET ?`,
    ).all(...parameters));

    return rows.map((row) => ({
      product: mapProduct(row),
      primaryCategory: row.category_id
        ? mapCategory({
            id: row.category_id,
            parent_id: null,
            name: row.category_name,
            slug: row.category_slug,
            description: row.category_description,
            image_url: row.category_image_url,
            seo_json: row.category_seo_json,
            display_order: row.category_display_order,
            status: row.category_status,
            created_at: row.category_created_at,
            updated_at: row.category_updated_at,
          })
        : null,
      minimumPriceCents: number(row, "minimum_price"),
      maximumPriceCents: number(row, "maximum_price"),
      available: number(row, "available_count") > 0,
      madeToOrder: number(row, "made_to_order_count") > 0,
    }));
  }

  getStandardProduct(productId: string): StandardProductAggregate | null {
    const productRow = asRow(this.db.prepare("SELECT * FROM products WHERE id = ?").get(productId));
    if (!productRow || text(productRow, "type") !== "STANDARD_PRODUCT") return null;
    const configRow = asRow(
      this.db.prepare("SELECT * FROM standard_product_configurations WHERE product_id = ?").get(productId),
    );
    if (!configRow) return null;
    const optionRows = asRows(
      this.db.prepare("SELECT * FROM product_options WHERE product_id = ? ORDER BY position").all(productId),
    );
    const options: ProductOption[] = optionRows.map((option) => ({
      id: text(option, "id"),
      productId,
      name: text(option, "name"),
      position: number(option, "position"),
      values: asRows(
        this.db.prepare("SELECT * FROM product_option_values WHERE option_id = ? ORDER BY position").all(text(option, "id")),
      ).map((value) => ({
        id: text(value, "id"),
        optionId: text(value, "option_id"),
        value: text(value, "value"),
        position: number(value, "position"),
      })),
    }));
    const variants = asRows(
      this.db.prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY base_price_cents, sku").all(productId),
    ).map(mapVariant);
    const priceTables = variants.flatMap((variant) => this.getVariantPriceTables(variant.id));
    const categories = asRows(
      this.db.prepare(
        `SELECT c.* FROM categories c JOIN product_categories pc ON pc.category_id = c.id
         WHERE pc.product_id = ? ORDER BY pc.is_primary DESC, c.display_order`,
      ).all(productId),
    ).map(mapCategory);
    const personalizationFields = asRows(
      this.db.prepare("SELECT * FROM personalization_fields WHERE product_id = ? ORDER BY position").all(productId),
    ).map(mapPersonalizationField);
    const inventoryMovements = asRows(
      this.db.prepare(
        `SELECT movements.*, variants.sku variant_sku
         FROM inventory_movements movements
         JOIN product_variants variants ON variants.id = movements.variant_id
         WHERE variants.product_id = ?
         ORDER BY movements.created_at DESC
         LIMIT 100`,
      ).all(productId),
    ).map(mapInventoryMovement);
    const configuration: StandardProductConfiguration = {
      productId,
      minimumQuantity: number(configRow, "minimum_quantity"),
      quantityIncrement: number(configRow, "quantity_increment"),
      personalizationMode: text(configRow, "personalization_mode") as StandardProductConfiguration["personalizationMode"],
      reviewRequired: bool(configRow, "review_required"),
      leadTimeBusinessDays: number(configRow, "lead_time_business_days"),
      fulfillmentOptions: json(configRow, "fulfillment_options_json"),
      createdAt: text(configRow, "created_at"),
      updatedAt: text(configRow, "updated_at"),
    };
    return {
      product: mapProduct(productRow),
      configuration,
      categories,
      options,
      variants,
      priceTables,
      personalizationFields,
      inventoryMovements,
    };
  }

  findStandardProductBySlug(slug: string): StandardProductAggregate | null {
    const row = asRow(this.db.prepare("SELECT id FROM products WHERE slug = ? AND type = 'STANDARD_PRODUCT'").get(slug));
    return row ? this.getStandardProduct(text(row, "id")) : null;
  }

  createStandardProduct(input: CreateStandardProductInput, actorId: string): StandardProductAggregate {
    if (input.variants.length === 0) throw new Error("Cadastre ao menos uma variante.");
    if (input.primaryCategoryId && !input.categoryIds.includes(input.primaryCategoryId)) {
      throw new Error("A categoria principal deve pertencer ao produto.");
    }
    const productId = domainId("product");
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO products (
          id, code, name, slug, type, summary, description, status, featured,
          display_order, payment_methods_json, fulfillment_options_json,
          main_image_url, gallery_json, seo_json, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'STANDARD_PRODUCT', ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      ).run(
        productId,
        input.product.code,
        input.product.name,
        input.product.slug,
        input.product.summary,
        input.product.description,
        Number(input.product.featured),
        input.product.displayOrder,
        JSON.stringify(input.product.paymentMethods),
        JSON.stringify(input.product.fulfillmentOptions),
        input.product.mainImageUrl,
        JSON.stringify(input.product.gallery),
        JSON.stringify(input.product.seo),
        timestamp,
        timestamp,
      );
      this.db.prepare(
        `INSERT INTO standard_product_configurations (
          product_id, minimum_quantity, quantity_increment, personalization_mode,
          review_required, lead_time_business_days, fulfillment_options_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        productId,
        input.configuration.minimumQuantity,
        input.configuration.quantityIncrement,
        input.configuration.personalizationMode,
        Number(input.configuration.reviewRequired),
        input.configuration.leadTimeBusinessDays,
        JSON.stringify(input.configuration.fulfillmentOptions),
        timestamp,
        timestamp,
      );
      input.categoryIds.forEach((categoryId) => {
        this.db.prepare(
          "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (?, ?, ?)",
        ).run(productId, categoryId, Number(categoryId === input.primaryCategoryId));
      });
      input.options.forEach((option, optionPosition) => {
        const optionId = domainId("option");
        this.db.prepare("INSERT INTO product_options (id, product_id, name, position) VALUES (?, ?, ?, ?)")
          .run(optionId, productId, option.name.trim(), optionPosition);
        option.values.forEach((value, valuePosition) => {
          this.db.prepare("INSERT INTO product_option_values (id, option_id, value, position) VALUES (?, ?, ?, ?)")
            .run(domainId("option_value"), optionId, value.trim(), valuePosition);
        });
      });
      input.variants.forEach((variant) => {
        const variantId = domainId("variant");
        this.db.prepare(
          `INSERT INTO product_variants (
            id, product_id, sku, option_values_json, base_price_cents,
            minimum_quantity, quantity_increment, stock_mode, available_quantity,
            reserved_quantity, weight_grams, width_cm, height_cm, length_cm,
            active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          variantId, productId, variant.sku, JSON.stringify(variant.optionValues),
          variant.basePriceCents, variant.minimumQuantity, variant.quantityIncrement,
          variant.stockMode, variant.stockMode === "TRACKED" ? variant.availableQuantity ?? 0 : null,
          variant.weightGrams, variant.widthCm, variant.heightCm, variant.lengthCm,
          Number(variant.active), timestamp, timestamp,
        );
        const priceTableId = domainId("variant_price_table");
        this.db.prepare(
          `INSERT INTO variant_price_tables (
            id, variant_id, version, status, valid_from, valid_until, created_at, published_at
          ) VALUES (?, ?, 1, 'PUBLISHED', NULL, NULL, ?, ?)`,
        ).run(priceTableId, variantId, timestamp, timestamp);
        this.db.prepare(
          `INSERT INTO variant_price_tiers (
            id, price_table_id, minimum_quantity, maximum_exclusive_quantity,
            unit_price_cents, position
          ) VALUES (?, ?, ?, NULL, ?, 0)`,
        ).run(domainId("variant_price_tier"), priceTableId, variant.minimumQuantity, variant.basePriceCents);
        if (variant.stockMode === "TRACKED" && (variant.availableQuantity ?? 0) > 0) {
          this.db.prepare(
            `INSERT INTO inventory_movements (
              id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
            ) VALUES (?, ?, NULL, 'INITIAL', ?, 'Saldo inicial do cadastro', ?, ?)`,
          ).run(domainId("inventory"), variantId, variant.availableQuantity ?? 0, actorId, timestamp);
        }
      });
      input.personalizationFields.forEach((field, position) => {
        this.db.prepare(
          `INSERT INTO personalization_fields (
            id, product_id, field_key, label, field_type, required, options_json,
            maximum_length, price_adjustment_cents, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          domainId("personalization"), productId, field.key, field.label, field.type,
          Number(field.required), JSON.stringify(field.options), field.maximumLength,
          field.priceAdjustmentCents, field.position ?? position,
        );
      });
      this.reindexProduct(productId);
      writeAudit(this.db, {
        actorId,
        action: "STANDARD_PRODUCT_CREATED",
        entityType: "Product",
        entityId: productId,
        after: { code: input.product.code, variants: input.variants.length },
      });
    })();
    return this.getStandardProduct(productId)!;
  }

  updateStandardProduct(
    productId: string,
    input: UpdateStandardProductInput,
    actorId: string,
  ): StandardProductAggregate {
    const current = this.getStandardProduct(productId);
    if (!current) throw new Error("Produto padrão não encontrado.");
    if (current.product.status === "ARCHIVED") throw new Error("Um produto arquivado não pode ser editado.");
    if (!input.categoryIds.length || !input.primaryCategoryId || !input.categoryIds.includes(input.primaryCategoryId)) {
      throw new Error("Selecione uma categoria principal válida.");
    }
    if (!input.variants.length) throw new Error("Cadastre ao menos uma variante.");
    if (!input.configuration.fulfillmentOptions.length) throw new Error("Habilite retirada local ou entrega nacional.");

    const optionNames = new Set<string>();
    const normalizedOptions = input.options.map((option) => {
      const name = option.name.trim();
      const values = [...new Set(option.values.map((value) => value.trim()).filter(Boolean))];
      if (!name || !values.length) throw new Error("Cada opção precisa de nome e ao menos um valor.");
      const normalizedName = name.toLocaleLowerCase("pt-BR");
      if (optionNames.has(normalizedName)) throw new Error(`A opção ${name} está duplicada.`);
      optionNames.add(normalizedName);
      return { name, values };
    });

    const currentVariants = new Map(current.variants.map((variant) => [variant.id, variant]));
    const submittedExistingIds = new Set(input.variants.flatMap((variant) => variant.id ? [variant.id] : []));
    const missingVariant = current.variants.find((variant) => !submittedExistingIds.has(variant.id));
    if (missingVariant) {
      throw new Error(`A variante ${missingVariant.sku} não pode ser removida. Desative-a para preservar o histórico.`);
    }
    const skus = new Set<string>();
    input.variants.forEach((variant) => {
      const sku = variant.sku.trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(sku)) throw new Error(`O SKU ${variant.sku} é inválido.`);
      if (skus.has(sku)) throw new Error(`O SKU ${sku} está duplicado.`);
      skus.add(sku);
      if (variant.id && !currentVariants.has(variant.id)) throw new Error("Uma variante informada não pertence ao produto.");
      if (!Number.isInteger(variant.minimumQuantity) || variant.minimumQuantity < 1 ||
          !Number.isInteger(variant.quantityIncrement) || variant.quantityIncrement < 1) {
        throw new Error(`Revise a quantidade mínima e o incremento de ${sku}.`);
      }
      if (variant.stockMode === "TRACKED" && (!Number.isInteger(variant.availableQuantity ?? 0) || (variant.availableQuantity ?? 0) < 0)) {
        throw new Error(`O saldo inicial de ${sku} é inválido.`);
      }
      if (!variant.id && (!variant.basePriceCents || variant.basePriceCents <= 0)) {
        throw new Error(`Informe o preço inicial da nova variante ${sku}.`);
      }
      Object.entries(variant.optionValues).forEach(([name, value]) => {
        const option = normalizedOptions.find((candidate) => candidate.name === name);
        if (!option || !option.values.includes(value)) throw new Error(`A combinação de ${sku} usa uma opção inválida.`);
      });
    });

    const fieldKeys = new Set<string>();
    input.personalizationFields.forEach((field) => {
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(field.key)) throw new Error(`A chave ${field.key} deve usar letras minúsculas, números e sublinhado.`);
      if (fieldKeys.has(field.key)) throw new Error(`A chave ${field.key} está duplicada.`);
      fieldKeys.add(field.key);
      if (field.type === "SELECT" && !field.options.length) throw new Error(`Cadastre as opções do campo ${field.label}.`);
    });
    if (input.configuration.personalizationMode === "STRUCTURED_FIELDS" && !input.personalizationFields.length) {
      throw new Error("Cadastre ao menos um campo de personalização estruturada.");
    }

    const timestamp = nowIso();
    this.db.transaction(() => {
      new ProductRepository(this.db).updateProduct(productId, {
        ...input.product,
        paymentMethods: ["PIX", "CREDIT_CARD"],
      }, actorId);

      this.db.prepare(
        `UPDATE standard_product_configurations SET
          minimum_quantity = ?, quantity_increment = ?, personalization_mode = ?,
          review_required = ?, lead_time_business_days = ?, fulfillment_options_json = ?,
          updated_at = ? WHERE product_id = ?`,
      ).run(
        input.configuration.minimumQuantity,
        input.configuration.quantityIncrement,
        input.configuration.personalizationMode,
        Number(input.configuration.reviewRequired),
        input.configuration.leadTimeBusinessDays,
        JSON.stringify(input.configuration.fulfillmentOptions),
        timestamp,
        productId,
      );

      this.db.prepare("DELETE FROM product_categories WHERE product_id = ?").run(productId);
      input.categoryIds.forEach((categoryId) => {
        const category = asRow(this.db.prepare("SELECT id FROM categories WHERE id = ? AND status <> 'ARCHIVED'").get(categoryId));
        if (!category) throw new Error("Uma categoria selecionada não está disponível.");
        this.db.prepare("INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (?, ?, ?)")
          .run(productId, categoryId, Number(categoryId === input.primaryCategoryId));
      });

      this.db.prepare("DELETE FROM product_options WHERE product_id = ?").run(productId);
      normalizedOptions.forEach((option, position) => {
        const optionId = domainId("option");
        this.db.prepare("INSERT INTO product_options (id, product_id, name, position) VALUES (?, ?, ?, ?)")
          .run(optionId, productId, option.name, position);
        option.values.forEach((value, valuePosition) => {
          this.db.prepare("INSERT INTO product_option_values (id, option_id, value, position) VALUES (?, ?, ?, ?)")
            .run(domainId("option_value"), optionId, value, valuePosition);
        });
      });

      input.variants.forEach((variant) => {
        const sku = variant.sku.trim().toUpperCase();
        if (variant.id) {
          const previous = currentVariants.get(variant.id)!;
          if (variant.stockMode === "MADE_TO_ORDER" && previous.reservedQuantity > 0) {
            throw new Error(`A variante ${sku} possui reservas e não pode virar sob encomenda.`);
          }
          const nextAvailable = variant.stockMode === "TRACKED"
            ? previous.stockMode === "TRACKED" ? previous.availableQuantity ?? 0 : variant.availableQuantity ?? 0
            : null;
          this.db.prepare(
            `UPDATE product_variants SET sku = ?, option_values_json = ?, minimum_quantity = ?,
              quantity_increment = ?, stock_mode = ?, available_quantity = ?, weight_grams = ?,
              width_cm = ?, height_cm = ?, length_cm = ?, active = ?, updated_at = ?
             WHERE id = ? AND product_id = ?`,
          ).run(
            sku, JSON.stringify(variant.optionValues), variant.minimumQuantity,
            variant.quantityIncrement, variant.stockMode, nextAvailable, variant.weightGrams,
            variant.widthCm, variant.heightCm, variant.lengthCm, Number(variant.active),
            timestamp, variant.id, productId,
          );
          if (previous.stockMode === "MADE_TO_ORDER" && variant.stockMode === "TRACKED" && (nextAvailable ?? 0) > 0) {
            this.db.prepare(
              `INSERT INTO inventory_movements (
                id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
              ) VALUES (?, ?, NULL, 'INITIAL', ?, 'Controle de estoque ativado', ?, ?)`,
            ).run(domainId("inventory"), variant.id, nextAvailable ?? 0, actorId, timestamp);
          }
          return;
        }

        const variantId = domainId("variant");
        const basePriceCents = variant.basePriceCents!;
        const availableQuantity = variant.stockMode === "TRACKED" ? variant.availableQuantity ?? 0 : null;
        this.db.prepare(
          `INSERT INTO product_variants (
            id, product_id, sku, option_values_json, base_price_cents,
            minimum_quantity, quantity_increment, stock_mode, available_quantity,
            reserved_quantity, weight_grams, width_cm, height_cm, length_cm,
            active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          variantId, productId, sku, JSON.stringify(variant.optionValues), basePriceCents,
          variant.minimumQuantity, variant.quantityIncrement, variant.stockMode, availableQuantity,
          variant.weightGrams, variant.widthCm, variant.heightCm, variant.lengthCm,
          Number(variant.active), timestamp, timestamp,
        );
        const priceTableId = domainId("variant_price_table");
        this.db.prepare(
          `INSERT INTO variant_price_tables (
            id, variant_id, version, status, valid_from, valid_until, created_at, published_at
          ) VALUES (?, ?, 1, 'PUBLISHED', NULL, NULL, ?, ?)`,
        ).run(priceTableId, variantId, timestamp, timestamp);
        this.db.prepare(
          `INSERT INTO variant_price_tiers (
            id, price_table_id, minimum_quantity, maximum_exclusive_quantity,
            unit_price_cents, position
          ) VALUES (?, ?, ?, NULL, ?, 0)`,
        ).run(domainId("variant_price_tier"), priceTableId, variant.minimumQuantity, basePriceCents);
        if (availableQuantity && availableQuantity > 0) {
          this.db.prepare(
            `INSERT INTO inventory_movements (
              id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
            ) VALUES (?, ?, NULL, 'INITIAL', ?, 'Saldo inicial da nova variante', ?, ?)`,
          ).run(domainId("inventory"), variantId, availableQuantity, actorId, timestamp);
        }
      });

      this.db.prepare("DELETE FROM personalization_fields WHERE product_id = ?").run(productId);
      input.personalizationFields.forEach((field, position) => {
        this.db.prepare(
          `INSERT INTO personalization_fields (
            id, product_id, field_key, label, field_type, required, options_json,
            maximum_length, price_adjustment_cents, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          domainId("personalization"), productId, field.key, field.label.trim(), field.type,
          Number(field.required), JSON.stringify(field.options), field.maximumLength,
          field.priceAdjustmentCents, field.position ?? position,
        );
      });
      this.reindexProduct(productId);
      writeAudit(this.db, {
        actorId,
        action: "STANDARD_PRODUCT_UPDATED",
        entityType: "Product",
        entityId: productId,
        before: { variants: current.variants.length, status: current.product.status },
        after: { variants: input.variants.length, status: current.product.status },
      });
    })();
    return this.getStandardProduct(productId)!;
  }

  publishStandardProduct(productId: string, actorId: string): StandardProductAggregate {
    const aggregate = this.getStandardProduct(productId);
    if (!aggregate) throw new Error("Produto padrão não encontrado.");
    const checklist = validateStandardProductForPublication(aggregate);
    if (!checklist.canPublish) {
      throw new Error(checklist.checks.filter((check) => !check.complete).map((check) => check.message).join(" "));
    }
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare("UPDATE products SET status = 'PUBLISHED', published_at = ?, updated_at = ? WHERE id = ?")
        .run(timestamp, timestamp, productId);
      this.reindexProduct(productId);
      writeAudit(this.db, {
        actorId,
        action: "PRODUCT_PUBLISHED",
        entityType: "Product",
        entityId: productId,
        before: { status: aggregate.product.status },
        after: { status: "PUBLISHED" },
      });
    })();
    return this.getStandardProduct(productId)!;
  }

  createVariantPriceTableVersion(
    variantId: string,
    tiers: Array<{ minimumQuantity: number; unitPriceCents: number }>,
    actorId: string,
    validFrom: string | null = null,
  ): VariantPriceTable {
    const variant = asRow(this.db.prepare("SELECT * FROM product_variants WHERE id = ?").get(variantId));
    if (!variant) throw new Error("Variante não encontrada.");
    const ordered = [...tiers].sort((first, second) => first.minimumQuantity - second.minimumQuantity);
    if (!ordered.length || ordered[0].minimumQuantity !== number(variant, "minimum_quantity")) {
      throw new Error(`A primeira faixa deve começar em ${number(variant, "minimum_quantity")}.`);
    }
    ordered.forEach((tier, index) => {
      if (!Number.isInteger(tier.minimumQuantity) || tier.minimumQuantity <= 0 || !Number.isInteger(tier.unitPriceCents) || tier.unitPriceCents <= 0) {
        throw new Error(`A faixa ${index + 1} possui quantidade ou preço inválido.`);
      }
      if (index > 0 && tier.minimumQuantity <= ordered[index - 1].minimumQuantity) {
        throw new Error("As faixas devem usar quantidades iniciais diferentes.");
      }
    });
    if (validFrom && Number.isNaN(new Date(validFrom).getTime())) throw new Error("Data de vigência inválida.");
    const version = Number((asRow(this.db.prepare(
      "SELECT COALESCE(MAX(version), 0) version FROM variant_price_tables WHERE variant_id = ?",
    ).get(variantId)) ?? { version: 0 }).version) + 1;
    const id = domainId("variant_price_table");
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM variant_price_tables WHERE variant_id = ? AND status = 'DRAFT'").run(variantId);
      this.db.prepare(
        `INSERT INTO variant_price_tables (
          id, variant_id, version, status, valid_from, valid_until, created_at, published_at
        ) VALUES (?, ?, ?, 'DRAFT', ?, NULL, ?, NULL)`,
      ).run(id, variantId, version, validFrom, timestamp);
      ordered.forEach((tier, position) => {
        this.db.prepare(
          `INSERT INTO variant_price_tiers (
            id, price_table_id, minimum_quantity, maximum_exclusive_quantity,
            unit_price_cents, position
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(domainId("variant_price_tier"), id, tier.minimumQuantity,
          ordered[position + 1]?.minimumQuantity ?? null, tier.unitPriceCents, position);
      });
      writeAudit(this.db, {
        actorId,
        action: "VARIANT_PRICE_VERSION_CREATED",
        entityType: "VariantPriceTable",
        entityId: id,
        after: { variantId, version, tiers: ordered, validFrom },
      });
    })();
    return this.getVariantPriceTables(variantId).find((table) => table.id === id)!;
  }

  publishVariantPriceTable(tableId: string, actorId: string): VariantPriceTable {
    const table = asRow(this.db.prepare("SELECT * FROM variant_price_tables WHERE id = ?").get(tableId));
    if (!table) throw new Error("Tabela de preços não encontrada.");
    if (text(table, "status") !== "DRAFT") throw new Error("Apenas uma tabela em rascunho pode ser publicada.");
    const timestamp = nowIso();
    const validFrom = nullableText(table, "valid_from");
    const scheduled = validFrom !== null && new Date(validFrom).getTime() > Date.now();
    this.db.transaction(() => {
      if (scheduled) {
        this.db.prepare(
          `UPDATE variant_price_tables SET valid_until = ?
           WHERE variant_id = ? AND status = 'PUBLISHED'
             AND (valid_until IS NULL OR valid_until > ?)`,
        ).run(validFrom, text(table, "variant_id"), validFrom);
      } else {
        this.db.prepare(
          "UPDATE variant_price_tables SET status = 'ARCHIVED' WHERE variant_id = ? AND status = 'PUBLISHED'",
        ).run(text(table, "variant_id"));
      }
      this.db.prepare(
        `UPDATE variant_price_tables
         SET status = 'PUBLISHED', valid_from = COALESCE(valid_from, ?), published_at = ?
         WHERE id = ?`,
      ).run(timestamp, timestamp, tableId);
      const firstTier = asRow(this.db.prepare(
        "SELECT unit_price_cents FROM variant_price_tiers WHERE price_table_id = ? ORDER BY position LIMIT 1",
      ).get(tableId));
      this.db.prepare("UPDATE product_variants SET base_price_cents = ?, updated_at = ? WHERE id = ?")
        .run(number(firstTier!, "unit_price_cents"), timestamp, text(table, "variant_id"));
      writeAudit(this.db, {
        actorId,
        action: "VARIANT_PRICE_VERSION_PUBLISHED",
        entityType: "VariantPriceTable",
        entityId: tableId,
        after: { version: number(table, "version"), validFrom: validFrom ?? timestamp },
      });
    })();
    return this.getVariantPriceTables(text(table, "variant_id")).find((candidate) => candidate.id === tableId)!;
  }

  calculateStandardPrice(
    variantId: string,
    quantity: number,
    customization: Record<string, string | number> = {},
    at = nowIso(),
  ): StandardProductPriceQuote {
    const variantRow = asRow(this.db.prepare("SELECT * FROM product_variants WHERE id = ?").get(variantId));
    if (!variantRow) throw new Error("Variante não encontrada.");
    const variant = mapVariant(variantRow);
    if (!isVariantAvailable(variant)) throw new Error("Esta variante está indisponível.");
    assertQuantityRule(quantity, variant.minimumQuantity, variant.quantityIncrement);
    if (variant.stockMode === "TRACKED" && quantity > (variant.availableQuantity ?? 0) - variant.reservedQuantity) {
      throw new Error("A quantidade solicitada não está disponível em estoque.");
    }
    const table = this.getVariantPriceTables(variantId).find(
      (candidate) => candidate.status === "PUBLISHED" &&
        (!candidate.validFrom || candidate.validFrom <= at) &&
        (!candidate.validUntil || candidate.validUntil > at),
    );
    const tier = table?.tiers.find(
      (candidate) => quantity >= candidate.minimumQuantity &&
        (candidate.maximumExclusiveQuantity === null || quantity < candidate.maximumExclusiveQuantity),
    );
    const fields = asRows(
      this.db.prepare("SELECT * FROM personalization_fields WHERE product_id = ? ORDER BY position").all(variant.productId),
    ).map(mapPersonalizationField);
    let personalizationCents = 0;
    fields.forEach((field) => {
      const value = customization[field.key];
      if (field.required && (value === undefined || String(value).trim() === "")) {
        throw new Error(`Preencha ${field.label}.`);
      }
      if (value !== undefined && field.maximumLength && String(value).length > field.maximumLength) {
        throw new Error(`${field.label} aceita no máximo ${field.maximumLength} caracteres.`);
      }
      if (value !== undefined && field.type === "SELECT" && !field.options.includes(String(value))) {
        throw new Error(`Selecione uma opção válida para ${field.label}.`);
      }
      if (value !== undefined && String(value).trim() !== "") personalizationCents += field.priceAdjustmentCents;
    });
    const unitPriceCents = tier?.unitPriceCents ?? variant.basePriceCents;
    return {
      variantId,
      priceTableId: table?.id ?? null,
      priceTableVersion: table?.version ?? null,
      priceTierId: tier?.id ?? null,
      quantity,
      unitPriceCents,
      personalizationCents,
      totalCents: quantity * unitPriceCents + personalizationCents,
      currency: "BRL",
    };
  }

  adjustInventory(variantId: string, delta: number, reason: string, actorId: string): ProductVariant {
    if (!Number.isInteger(delta) || delta === 0) throw new Error("Informe uma alteração inteira diferente de zero.");
    if (!reason.trim()) throw new Error("Informe o motivo do ajuste.");
    const row = asRow(this.db.prepare("SELECT * FROM product_variants WHERE id = ?").get(variantId));
    if (!row) throw new Error("Variante não encontrada.");
    const current = mapVariant(row);
    if (current.stockMode !== "TRACKED") throw new Error("Produtos sob encomenda não possuem saldo de estoque.");
    const next = (current.availableQuantity ?? 0) + delta;
    if (next < current.reservedQuantity) throw new Error("O saldo não pode ficar abaixo da quantidade reservada.");
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare("UPDATE product_variants SET available_quantity = ?, updated_at = ? WHERE id = ?")
        .run(next, timestamp, variantId);
      this.db.prepare(
        `INSERT INTO inventory_movements (
          id, variant_id, order_id, movement_type, quantity, reason, actor_id, created_at
        ) VALUES (?, ?, NULL, 'ADJUSTMENT', ?, ?, ?, ?)`,
      ).run(domainId("inventory"), variantId, delta, reason.trim(), actorId, timestamp);
      writeAudit(this.db, {
        actorId,
        action: "INVENTORY_ADJUSTED",
        entityType: "ProductVariant",
        entityId: variantId,
        before: { availableQuantity: current.availableQuantity },
        after: { availableQuantity: next, delta, reason: reason.trim() },
      });
    })();
    return mapVariant(asRow(this.db.prepare("SELECT * FROM product_variants WHERE id = ?").get(variantId))!);
  }

  getOrCreateCart(tokenHash: string, customer?: { id: string; email: string }): Cart {
    let row = asRow(this.db.prepare("SELECT * FROM carts WHERE token_hash = ? AND status = 'ACTIVE'").get(tokenHash));
    const timestamp = nowIso();
    if (!row) {
      const id = domainId("cart");
      this.db.prepare(
        `INSERT INTO carts (
          id, token_hash, customer_id, customer_email, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      ).run(id, tokenHash, customer?.id ?? null, customer?.email ?? null,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), timestamp, timestamp);
      row = asRow(this.db.prepare("SELECT * FROM carts WHERE id = ?").get(id));
    }
    if (customer) return this.claimCart(text(row!, "id"), customer);
    return this.mapCart(row!);
  }

  claimCart(cartId: string, customer: { id: string; email: string }): Cart {
    const current = asRow(this.db.prepare("SELECT * FROM carts WHERE id = ? AND status = 'ACTIVE'").get(cartId));
    if (!current) throw new Error("Carrinho indisponível.");
    const timestamp = nowIso();
    this.db.transaction(() => {
      const previousCarts = asRows(this.db.prepare(
        `SELECT id FROM carts
         WHERE customer_id = ? AND status = 'ACTIVE' AND id <> ?
         ORDER BY updated_at`,
      ).all(customer.id, cartId));
      previousCarts.forEach((previous) => {
        const previousId = text(previous, "id");
        const items = asRows(this.db.prepare("SELECT * FROM cart_items WHERE cart_id = ?").all(previousId));
        items.forEach((item) => {
          const matching = asRow(this.db.prepare(
            `SELECT id, quantity FROM cart_items
             WHERE cart_id = ? AND product_id = ?
               AND COALESCE(variant_id, '') = COALESCE(?, '')
               AND customization_json = ?
               AND COALESCE(artwork_asset_id, '') = COALESCE(?, '')`,
          ).get(cartId, text(item, "product_id"), nullableText(item, "variant_id"), text(item, "customization_json"), nullableText(item, "artwork_asset_id")));
          if (matching) {
            this.db.prepare("UPDATE cart_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?")
              .run(number(item, "quantity"), timestamp, text(matching, "id"));
            this.db.prepare("DELETE FROM cart_items WHERE id = ?").run(text(item, "id"));
          } else {
            this.db.prepare("UPDATE cart_items SET cart_id = ?, updated_at = ? WHERE id = ?")
              .run(cartId, timestamp, text(item, "id"));
          }
        });
        this.db.prepare("UPDATE carts SET status = 'ABANDONED', updated_at = ? WHERE id = ?")
          .run(timestamp, previousId);
      });
      this.db.prepare("UPDATE carts SET customer_id = ?, customer_email = ?, updated_at = ? WHERE id = ?")
        .run(customer.id, customer.email, timestamp, cartId);
      writeAudit(this.db, {
        actorId: customer.id,
        action: "CART_CLAIMED",
        entityType: "Cart",
        entityId: cartId,
        after: { mergedCartCount: previousCarts.length },
      });
    })();
    return this.mapCart(asRow(this.db.prepare("SELECT * FROM carts WHERE id = ?").get(cartId))!);
  }

  findCartByTokenHash(tokenHash: string): Cart | null {
    const row = asRow(this.db.prepare("SELECT * FROM carts WHERE token_hash = ? AND status = 'ACTIVE'").get(tokenHash));
    return row ? this.mapCart(row) : null;
  }

  findCartById(cartId: string): Cart | null {
    const row = asRow(
      this.db.prepare("SELECT * FROM carts WHERE id = ? AND status = 'ACTIVE'").get(cartId),
    );
    return row ? this.mapCart(row) : null;
  }

  upsertCartItem(cartId: string, input: UpsertCartItemInput): CartItem {
    const cart = asRow(this.db.prepare("SELECT * FROM carts WHERE id = ? AND status = 'ACTIVE'").get(cartId));
    if (!cart) throw new Error("Carrinho indisponível.");
    const product = asRow(this.db.prepare("SELECT * FROM products WHERE id = ? AND status = 'PUBLISHED'").get(input.productId));
    if (!product) throw new Error("Produto indisponível.");
    if (text(product, "type") === "STANDARD_PRODUCT") {
      if (!input.variantId) throw new Error("Selecione uma variação.");
      const quote = this.calculateStandardPrice(input.variantId, input.quantity, input.customization);
      if (quote.variantId !== input.variantId) throw new Error("Variação inválida.");
      const config = asRow(this.db.prepare(
        "SELECT personalization_mode FROM standard_product_configurations WHERE product_id = ?",
      ).get(input.productId));
      if (config?.personalization_mode === "ARTWORK_UPLOAD" && !input.artworkAssetId) {
        throw new Error("Envie a arte antes de adicionar este produto.");
      }
    } else {
      const config = asRow(this.db.prepare(
        "SELECT minimum_meters, meter_increment FROM dtf_product_configurations WHERE product_id = ?",
      ).get(input.productId));
      if (!config) throw new Error("Configuração do DTF não encontrada.");
      const minimum = number(config, "minimum_meters");
      const increment = number(config, "meter_increment");
      if (input.quantity < minimum || (input.quantity - minimum) % increment !== 0) {
        throw new Error(`Informe uma metragem válida a partir de ${minimum} m.`);
      }
      if (!input.artworkAssetId) throw new Error("Envie a arte antes de adicionar o DTF.");
    }
    const existing = asRow(this.db.prepare(
      `SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?
       AND COALESCE(variant_id, '') = COALESCE(?, '')
       AND customization_json = ? AND COALESCE(artwork_asset_id, '') = COALESCE(?, '')`,
    ).get(cartId, input.productId, input.variantId, JSON.stringify(input.customization ?? {}), input.artworkAssetId ?? null));
    const timestamp = nowIso();
    if (existing) {
      const nextQuantity = number(existing, "quantity") + input.quantity;
      if (input.variantId) this.calculateStandardPrice(input.variantId, nextQuantity, input.customization);
      this.db.prepare("UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?")
        .run(nextQuantity, timestamp, text(existing, "id"));
      return mapCartItem(asRow(this.db.prepare("SELECT * FROM cart_items WHERE id = ?").get(text(existing, "id")))!);
    }
    const id = domainId("cart_item");
    this.db.prepare(
      `INSERT INTO cart_items (
        id, cart_id, product_id, variant_id, quantity, unit,
        customization_json, artwork_asset_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, cartId, input.productId, input.variantId, input.quantity,
      text(product, "type") === "DTF_BY_METER" ? "METER" : "UNIT",
      JSON.stringify(input.customization ?? {}), input.artworkAssetId ?? null, timestamp, timestamp);
    return mapCartItem(asRow(this.db.prepare("SELECT * FROM cart_items WHERE id = ?").get(id))!);
  }

  updateCartItemQuantity(cartId: string, itemId: string, quantity: number): void {
    const row = asRow(this.db.prepare("SELECT * FROM cart_items WHERE id = ? AND cart_id = ?").get(itemId, cartId));
    if (!row) throw new Error("Item não encontrado no carrinho.");
    const variantId = nullableText(row, "variant_id");
    if (variantId) {
      this.calculateStandardPrice(variantId, quantity, json(row, "customization_json"));
    } else {
      const config = asRow(this.db.prepare(
        `SELECT c.minimum_meters, c.meter_increment
         FROM cart_items ci
         JOIN dtf_product_configurations c ON c.product_id = ci.product_id
         WHERE ci.id = ?`,
      ).get(itemId));
      if (!config) throw new Error("Configuração do DTF não encontrada.");
      const minimum = number(config, "minimum_meters");
      if (quantity < minimum || (quantity - minimum) % number(config, "meter_increment") !== 0) {
        throw new Error(`Informe uma metragem válida a partir de ${minimum} m.`);
      }
    }
    this.db.prepare("UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?")
      .run(quantity, nowIso(), itemId);
  }

  removeCartItem(cartId: string, itemId: string): void {
    this.db.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(itemId, cartId);
  }

  cartLines(cart: Cart): CartLine[] {
    return cart.items.map((item) => {
      const productRow = asRow(this.db.prepare("SELECT * FROM products WHERE id = ?").get(item.productId));
      if (!productRow) throw new Error("Produto do carrinho não encontrado.");
      const product = mapProduct(productRow);
      if (product.type === "STANDARD_PRODUCT") {
        if (!item.variantId) throw new Error("Item padrão sem variante.");
        const variantRow = asRow(this.db.prepare("SELECT * FROM product_variants WHERE id = ?").get(item.variantId));
        if (!variantRow) throw new Error("Variante do carrinho não encontrada.");
        const variant = mapVariant(variantRow);
        const quote = this.calculateStandardPrice(variant.id, item.quantity, item.customization);
        return { ...item, product, variant, unitPriceCents: quote.unitPriceCents,
          personalizationCents: quote.personalizationCents, totalCents: quote.totalCents };
      }
      const snapshot = asRow(this.db.prepare(
        `SELECT pt.id price_table_id, pt.version, tier.id tier_id, tier.unit_price_cents
         FROM price_tables pt JOIN price_tiers tier ON tier.price_table_id = pt.id
         WHERE pt.product_id = ? AND pt.status = 'PUBLISHED'
           AND (pt.valid_from IS NULL OR pt.valid_from <= ?)
           AND (pt.valid_until IS NULL OR pt.valid_until > ?)
           AND tier.minimum_meters <= ?
           AND (tier.maximum_exclusive_meters IS NULL OR tier.maximum_exclusive_meters > ?)
         ORDER BY pt.version DESC LIMIT 1`,
      ).get(item.productId, nowIso(), nowIso(), item.quantity, item.quantity));
      if (!snapshot) throw new Error("O DTF do carrinho não possui preço vigente.");
      const unitPriceCents = number(snapshot, "unit_price_cents");
      return { ...item, product, variant: null, unitPriceCents,
        personalizationCents: 0, totalCents: unitPriceCents * item.quantity };
    });
  }

  private getVariantPriceTables(variantId: string): VariantPriceTable[] {
    return asRows(this.db.prepare(
      "SELECT * FROM variant_price_tables WHERE variant_id = ? ORDER BY version DESC",
    ).all(variantId)).map((table) => ({
      id: text(table, "id"),
      variantId,
      version: number(table, "version"),
      status: text(table, "status") as VariantPriceTable["status"],
      validFrom: nullableText(table, "valid_from"),
      validUntil: nullableText(table, "valid_until"),
      createdAt: text(table, "created_at"),
      publishedAt: nullableText(table, "published_at"),
      tiers: asRows(this.db.prepare(
        "SELECT * FROM variant_price_tiers WHERE price_table_id = ? ORDER BY position",
      ).all(text(table, "id"))).map(mapVariantTier),
    }));
  }

  private mapCart(row: SqlRow): Cart {
    return {
      id: text(row, "id"),
      customerId: nullableText(row, "customer_id"),
      customerEmail: nullableText(row, "customer_email"),
      status: text(row, "status") as Cart["status"],
      expiresAt: text(row, "expires_at"),
      createdAt: text(row, "created_at"),
      updatedAt: text(row, "updated_at"),
      items: asRows(this.db.prepare(
        "SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at",
      ).all(text(row, "id"))).map(mapCartItem),
    };
  }

  private reindexProduct(productId: string): void {
    const product = asRow(this.db.prepare("SELECT * FROM products WHERE id = ?").get(productId));
    if (!product) return;
    const attributes = asRows(
      this.db.prepare("SELECT option_values_json FROM product_variants WHERE product_id = ?").all(productId),
    ).flatMap((row) => Object.values(json<Record<string, string>>(row, "option_values_json"))).join(" ");
    this.db.prepare("DELETE FROM product_search WHERE product_id = ?").run(productId);
    this.db.prepare(
      "INSERT INTO product_search (product_id, name, code, summary, description, attributes) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(productId, text(product, "name"), text(product, "code"), text(product, "summary"), text(product, "description"), attributes);
  }
}
