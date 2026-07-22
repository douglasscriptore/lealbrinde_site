import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

import { databasePath } from "../src/server/runtime-paths";

const TABLES = [
  "categories",
  "products",
  "product_categories",
  "product_options",
  "product_option_values",
  "product_variants",
  "variant_price_tables",
  "variant_price_tiers",
  "price_tables",
  "price_tiers",
  "file_policies",
  "production_policies",
  "dtf_product_configurations",
  "standard_product_configurations",
  "product_specifications",
  "production_equipment",
  "product_payment_policies",
  "personalization_fields",
  "inventory_movements",
  "commerce_settings",
] as const;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function exportFirestoreCatalog() {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const tables = Object.fromEntries(
      TABLES.map((table) => [
        table,
        database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
      ]),
    );
    const payload = {
      migrationId: "sqlite-catalog-v1",
      source: "site-lealbrinde/sqlite",
      exportedAt: new Date().toISOString(),
      tables,
    };
    const checksum = createHash("sha256")
      .update(stableStringify(tables))
      .digest("hex");
    return { ...payload, checksum };
  } finally {
    database.close();
  }
}

const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const dryRun = process.argv.includes("--dry-run");
const result = exportFirestoreCatalog();

if (dryRun) {
  const counts = Object.fromEntries(
    Object.entries(result.tables).map(([table, rows]) => [table, rows.length]),
  );
  console.log(JSON.stringify({ migrationId: result.migrationId, checksum: result.checksum, counts }, null, 2));
} else {
  const output = resolve(outputArgument?.slice("--output=".length) || "output/catalog-firestore-v1.json");
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  console.log(`Catálogo exportado para ${output}. Checksum: ${result.checksum}`);
}
