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
