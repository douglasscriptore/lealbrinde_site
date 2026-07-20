import type Database from "better-sqlite3";

type Migration = {
  id: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    id: "001_initial_domain",
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('DTF_BY_METER', 'STANDARD_PRODUCT')),
        summary TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
        featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
        display_order INTEGER NOT NULL DEFAULT 0,
        payment_methods_json TEXT NOT NULL,
        fulfillment_options_json TEXT NOT NULL,
        main_image_url TEXT,
        gallery_json TEXT NOT NULL,
        seo_json TEXT NOT NULL,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_status_order
        ON products(status, display_order, name);
      CREATE INDEX IF NOT EXISTS idx_products_type_featured
        ON products(type, featured);

      CREATE TABLE IF NOT EXISTS file_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        accepted_extensions_json TEXT NOT NULL,
        maximum_file_size_mb INTEGER,
        minimum_resolution_dpi INTEGER,
        requires_transparent_background INTEGER NOT NULL DEFAULT 0
          CHECK (requires_transparent_background IN (0, 1)),
        color_policy TEXT NOT NULL,
        preparation_guide TEXT NOT NULL,
        confirmed INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS production_policies (
        id TEXT PRIMARY KEY,
        start_trigger TEXT NOT NULL
          CHECK (start_trigger = 'PAYMENT_CONFIRMED_AND_ARTWORK_APPROVED'),
        standard_start_within_business_hours INTEGER NOT NULL,
        custom_lead_time_above_meters INTEGER NOT NULL,
        large_order_mode TEXT NOT NULL CHECK (large_order_mode = 'MANUAL_CONFIRMATION')
      );

      CREATE TABLE IF NOT EXISTS dtf_product_configurations (
        product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
        minimum_meters INTEGER NOT NULL,
        meter_increment INTEGER NOT NULL,
        pricing_mode TEXT NOT NULL CHECK (pricing_mode = 'VOLUME_TOTAL'),
        payment_methods_json TEXT NOT NULL,
        printable_width_cm REAL,
        file_policy_id TEXT NOT NULL REFERENCES file_policies(id) ON DELETE RESTRICT,
        production_policy_id TEXT NOT NULL REFERENCES production_policies(id) ON DELETE RESTRICT,
        fulfillment_options_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS product_specifications (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        group_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        position INTEGER NOT NULL,
        visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
        confirmed INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1))
      );

      CREATE INDEX IF NOT EXISTS idx_product_specifications_order
        ON product_specifications(product_id, position);

      CREATE TABLE IF NOT EXISTS production_equipment (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_capacity_meters_per_hour REAL NOT NULL
          CHECK (unit_capacity_meters_per_hour > 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS price_tables (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL CHECK (version > 0),
        status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
        valid_from TEXT,
        valid_until TEXT,
        created_at TEXT NOT NULL,
        published_at TEXT,
        UNIQUE(product_id, version)
      );

      CREATE INDEX IF NOT EXISTS idx_price_tables_product_status
        ON price_tables(product_id, status, version DESC);

      CREATE TABLE IF NOT EXISTS price_tiers (
        id TEXT PRIMARY KEY,
        price_table_id TEXT NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
        minimum_meters INTEGER NOT NULL CHECK (minimum_meters > 0),
        maximum_exclusive_meters INTEGER,
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
        position INTEGER NOT NULL,
        CHECK (
          maximum_exclusive_meters IS NULL OR
          maximum_exclusive_meters > minimum_meters
        )
      );

      CREATE INDEX IF NOT EXISTS idx_price_tiers_table_order
        ON price_tiers(price_table_id, position);

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        quantity_meters INTEGER NOT NULL CHECK (quantity_meters > 0),
        price_snapshot_json TEXT NOT NULL,
        payment_status TEXT NOT NULL
          CHECK (payment_status IN ('DRAFT', 'PENDING_PIX', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED')),
        artwork_status TEXT NOT NULL
          CHECK (artwork_status IN ('UPLOADING', 'QUARANTINED', 'AUTO_REJECTED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED')),
        production_status TEXT NOT NULL
          CHECK (production_status IN ('BLOCKED', 'QUEUED', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED')),
        fulfillment_status TEXT NOT NULL
          CHECK (fulfillment_status IN ('PENDING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'PICKED_UP')),
        fulfillment_method TEXT NOT NULL CHECK (fulfillment_method IN ('PICKUP', 'SHIPPING')),
        production_ready_at TEXT,
        manual_lead_time_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_orders_product_created
        ON orders(product_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_attention
        ON orders(payment_status, artwork_status, production_status);

      CREATE TABLE IF NOT EXISTS order_events (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_order_events_order_created
        ON order_events(order_id, created_at);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_entity_created
        ON audit_logs(entity_type, entity_id, created_at DESC);
    `,
  },
  {
    id: "002_payment_artwork_fiscal",
    sql: `
      CREATE TABLE IF NOT EXISTS payment_attempts (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        provider TEXT NOT NULL,
        provider_reference TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency TEXT NOT NULL CHECK (currency = 'BRL'),
        status TEXT NOT NULL
          CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED')),
        expires_at TEXT,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(provider, provider_reference)
      );

      CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_created
        ON payment_attempts(order_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payment_attempts_status
        ON payment_attempts(status, updated_at);

      CREATE TABLE IF NOT EXISTS artwork_versions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL CHECK (version > 0),
        storage_key TEXT NOT NULL UNIQUE,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
        checksum_sha256 TEXT NOT NULL,
        scan_status TEXT NOT NULL
          CHECK (scan_status IN ('PENDING', 'CLEAN', 'REJECTED', 'FAILED')),
        preflight_status TEXT NOT NULL
          CHECK (preflight_status IN ('PENDING', 'PASSED', 'WARNING', 'BLOCKED')),
        review_status TEXT NOT NULL DEFAULT 'PENDING'
          CHECK (review_status IN ('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED')),
        review_note TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        uploaded_by TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(order_id, version)
      );

      CREATE INDEX IF NOT EXISTS idx_artwork_versions_order_version
        ON artwork_versions(order_id, version DESC);

      CREATE TABLE IF NOT EXISTS fiscal_documents (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        document_type TEXT NOT NULL CHECK (document_type IN ('INVOICE', 'RECEIPT')),
        version INTEGER NOT NULL CHECK (version > 0),
        storage_key TEXT NOT NULL UNIQUE,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
        is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
        uploaded_by TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(order_id, document_type, version)
      );

      CREATE INDEX IF NOT EXISTS idx_fiscal_documents_order_current
        ON fiscal_documents(order_id, document_type, is_current);
    `,
  },
  {
    id: "003_order_customer_data",
    sql: `
      CREATE TABLE IF NOT EXISTS order_customer_data (
        order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        contact_json TEXT NOT NULL,
        fulfillment_json TEXT NOT NULL,
        fiscal_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "004_product_payment_policy",
    sql: `
      CREATE TABLE IF NOT EXISTS product_payment_policies (
        product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
        pix_expiration_minutes INTEGER NOT NULL DEFAULT 30
          CHECK (pix_expiration_minutes >= 5),
        refund_policy TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "005_single_price_table_draft",
    sql: `
      UPDATE price_tables AS draft
      SET status = 'ARCHIVED',
          valid_until = COALESCE(valid_until, created_at)
      WHERE status = 'DRAFT'
        AND EXISTS (
          SELECT 1
          FROM price_tables AS newer
          WHERE newer.product_id = draft.product_id
            AND newer.status = 'DRAFT'
            AND newer.version > draft.version
        );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_price_tables_single_draft
        ON price_tables(product_id)
        WHERE status = 'DRAFT';
    `,
  },
  {
    id: "006_commerce_catalog",
    sql: `
      ALTER TABLE orders ADD COLUMN customer_id TEXT;
      ALTER TABLE orders ADD COLUMN payment_method TEXT
        CHECK (payment_method IN ('PIX', 'CREDIT_CARD'));
      ALTER TABLE orders ADD COLUMN subtotal_cents INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN shipping_cents INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN total_cents INTEGER NOT NULL DEFAULT 0;

      UPDATE orders SET
        payment_method = 'PIX',
        subtotal_cents = CAST(json_extract(price_snapshot_json, '$.subtotalCents') AS INTEGER),
        total_cents = CAST(json_extract(price_snapshot_json, '$.subtotalCents') AS INTEGER)
      WHERE payment_method IS NULL;

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        image_url TEXT,
        seo_json TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_categories_parent_order
        ON categories(parent_id, display_order, name);

      CREATE TABLE product_categories (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
        PRIMARY KEY(product_id, category_id)
      );

      CREATE UNIQUE INDEX idx_product_primary_category
        ON product_categories(product_id) WHERE is_primary = 1;

      CREATE TABLE standard_product_configurations (
        product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
        minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
        quantity_increment INTEGER NOT NULL DEFAULT 1 CHECK (quantity_increment > 0),
        personalization_mode TEXT NOT NULL DEFAULT 'NONE'
          CHECK (personalization_mode IN ('NONE', 'STRUCTURED_FIELDS', 'ARTWORK_UPLOAD')),
        review_required INTEGER NOT NULL DEFAULT 0 CHECK (review_required IN (0, 1)),
        lead_time_business_days INTEGER NOT NULL DEFAULT 3 CHECK (lead_time_business_days >= 0),
        fulfillment_options_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE product_options (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE(product_id, name)
      );

      CREATE TABLE product_option_values (
        id TEXT PRIMARY KEY,
        option_id TEXT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE(option_id, value)
      );

      CREATE TABLE product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        sku TEXT NOT NULL UNIQUE,
        option_values_json TEXT NOT NULL,
        base_price_cents INTEGER NOT NULL CHECK (base_price_cents > 0),
        minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
        quantity_increment INTEGER NOT NULL DEFAULT 1 CHECK (quantity_increment > 0),
        stock_mode TEXT NOT NULL CHECK (stock_mode IN ('TRACKED', 'MADE_TO_ORDER')),
        available_quantity INTEGER CHECK (available_quantity IS NULL OR available_quantity >= 0),
        reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
        weight_grams INTEGER NOT NULL DEFAULT 0 CHECK (weight_grams >= 0),
        width_cm REAL NOT NULL DEFAULT 0 CHECK (width_cm >= 0),
        height_cm REAL NOT NULL DEFAULT 0 CHECK (height_cm >= 0),
        length_cm REAL NOT NULL DEFAULT 0 CHECK (length_cm >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_product_variants_product_active
        ON product_variants(product_id, active, base_price_cents);

      CREATE TABLE variant_price_tables (
        id TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL CHECK (version > 0),
        status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
        valid_from TEXT,
        valid_until TEXT,
        created_at TEXT NOT NULL,
        published_at TEXT,
        UNIQUE(variant_id, version)
      );

      CREATE TABLE variant_price_tiers (
        id TEXT PRIMARY KEY,
        price_table_id TEXT NOT NULL REFERENCES variant_price_tables(id) ON DELETE CASCADE,
        minimum_quantity INTEGER NOT NULL CHECK (minimum_quantity > 0),
        maximum_exclusive_quantity INTEGER,
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
        position INTEGER NOT NULL,
        CHECK (
          maximum_exclusive_quantity IS NULL OR
          maximum_exclusive_quantity > minimum_quantity
        )
      );

      CREATE INDEX idx_variant_price_tables_active
        ON variant_price_tables(variant_id, status, valid_from, valid_until);

      CREATE TABLE personalization_fields (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        field_key TEXT NOT NULL,
        label TEXT NOT NULL,
        field_type TEXT NOT NULL
          CHECK (field_type IN ('TEXT', 'LONG_TEXT', 'SELECT', 'NUMBER', 'COLOR', 'NOTE')),
        required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
        options_json TEXT NOT NULL,
        maximum_length INTEGER,
        price_adjustment_cents INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE(product_id, field_key)
      );

      CREATE TABLE inventory_movements (
        id TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        order_id TEXT REFERENCES orders(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL
          CHECK (movement_type IN ('INITIAL', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'COMMITMENT')),
        quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_inventory_variant_created
        ON inventory_movements(variant_id, created_at DESC);

      CREATE TABLE carts (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        customer_email TEXT,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CONVERTED', 'ABANDONED')),
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_carts_customer_status
        ON carts(customer_id, status, updated_at DESC);

      CREATE TABLE cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        variant_id TEXT REFERENCES product_variants(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL CHECK (unit IN ('UNIT', 'METER')),
        customization_json TEXT NOT NULL,
        artwork_asset_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_cart_items_cart
        ON cart_items(cart_id, created_at);

      CREATE TABLE order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        variant_id TEXT REFERENCES product_variants(id) ON DELETE RESTRICT,
        product_type TEXT NOT NULL CHECK (product_type IN ('DTF_BY_METER', 'STANDARD_PRODUCT')),
        product_name TEXT NOT NULL,
        sku TEXT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL CHECK (unit IN ('UNIT', 'METER')),
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
        total_cents INTEGER NOT NULL CHECK (total_cents > 0),
        price_snapshot_json TEXT NOT NULL,
        customization_snapshot_json TEXT NOT NULL,
        shipping_snapshot_json TEXT NOT NULL,
        artwork_status TEXT NOT NULL
          CHECK (artwork_status IN ('NOT_REQUIRED', 'UPLOADING', 'QUARANTINED', 'AUTO_REJECTED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED')),
        production_status TEXT NOT NULL
          CHECK (production_status IN ('BLOCKED', 'QUEUED', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED')),
        production_ready_at TEXT,
        manual_lead_time_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_order_items_order ON order_items(order_id, created_at);
      CREATE INDEX idx_order_items_operations
        ON order_items(artwork_status, production_status, updated_at);

      INSERT INTO order_items (
        id, order_id, product_id, variant_id, product_type, product_name,
        sku, quantity, unit, unit_price_cents, total_cents,
        price_snapshot_json, customization_snapshot_json, shipping_snapshot_json,
        artwork_status, production_status, production_ready_at,
        manual_lead_time_note, created_at, updated_at
      )
      SELECT
        'legacy_item_' || orders.id,
        orders.id,
        orders.product_id,
        NULL,
        products.type,
        products.name,
        products.code,
        orders.quantity_meters,
        'METER',
        CAST(json_extract(orders.price_snapshot_json, '$.unitPriceCents') AS INTEGER),
        CAST(json_extract(orders.price_snapshot_json, '$.subtotalCents') AS INTEGER),
        orders.price_snapshot_json,
        '{}',
        '{}',
        orders.artwork_status,
        orders.production_status,
        orders.production_ready_at,
        orders.manual_lead_time_note,
        orders.created_at,
        orders.updated_at
      FROM orders
      JOIN products ON products.id = orders.product_id;

      ALTER TABLE artwork_versions ADD COLUMN order_item_id TEXT
        REFERENCES order_items(id) ON DELETE RESTRICT;

      UPDATE artwork_versions
      SET order_item_id = 'legacy_item_' || order_id
      WHERE order_item_id IS NULL;

      CREATE INDEX idx_artwork_versions_order_item
        ON artwork_versions(order_item_id, version DESC);

      CREATE TABLE shipping_quotes (
        id TEXT PRIMARY KEY,
        cart_id TEXT REFERENCES carts(id) ON DELETE CASCADE,
        order_id TEXT REFERENCES orders(id) ON DELETE RESTRICT,
        provider TEXT NOT NULL,
        service_code TEXT NOT NULL,
        service_label TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        estimated_business_days INTEGER NOT NULL CHECK (estimated_business_days >= 0),
        payload_json TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1)),
        created_at TEXT NOT NULL
      );

      CREATE TABLE fulfillments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
        method TEXT NOT NULL CHECK (method IN ('PICKUP', 'SHIPPING')),
        provider TEXT,
        service_code TEXT,
        shipment_id TEXT,
        tracking_code TEXT,
        status TEXT NOT NULL
          CHECK (status IN ('PENDING', 'READY_FOR_PICKUP', 'LABEL_CREATED', 'SHIPPED', 'DELIVERED', 'PICKED_UP')),
        quote_snapshot_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE integration_events (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        processed_at TEXT NOT NULL,
        UNIQUE(source, external_event_id)
      );

      CREATE TABLE commerce_settings (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        catalog_enabled INTEGER NOT NULL DEFAULT 1 CHECK (catalog_enabled IN (0, 1)),
        direct_checkout_enabled INTEGER NOT NULL DEFAULT 1 CHECK (direct_checkout_enabled IN (0, 1)),
        card_enabled INTEGER NOT NULL DEFAULT 0 CHECK (card_enabled IN (0, 1)),
        shipping_enabled INTEGER NOT NULL DEFAULT 0 CHECK (shipping_enabled IN (0, 1)),
        max_installments INTEGER NOT NULL DEFAULT 1 CHECK (max_installments BETWEEN 1 AND 12),
        statement_descriptor TEXT NOT NULL DEFAULT 'LEALBRINDE',
        updated_at TEXT NOT NULL
      );

      INSERT INTO commerce_settings (id, updated_at)
      VALUES ('default', datetime('now'));

      CREATE VIRTUAL TABLE product_search USING fts5(
        product_id UNINDEXED,
        name,
        code,
        summary,
        description,
        attributes,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      INSERT INTO product_search (
        product_id, name, code, summary, description, attributes
      )
      SELECT id, name, code, summary, description, '' FROM products;
    `,
  },
];

export function migrateDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const hasMigration = db.prepare(
    "SELECT 1 FROM schema_migrations WHERE id = ?",
  );
  const recordMigration = db.prepare(
    "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
  );

  for (const migration of migrations) {
    if (hasMigration.get(migration.id)) continue;

    db.transaction(() => {
      db.exec(migration.sql);
      recordMigration.run(migration.id, new Date().toISOString());
    })();
  }
}
