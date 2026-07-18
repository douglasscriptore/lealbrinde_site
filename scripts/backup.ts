import fs from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import { dataDirectory, databasePath } from "../src/server/runtime-paths";

async function main() {
  const backupDirectory = path.join(dataDirectory, "backups");
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(
    backupDirectory,
    `lealbrinde-${timestamp}.db`,
  );

  const database = new Database(databasePath, { readonly: true });
  try {
    await database.backup(destination);
  } finally {
    database.close();
  }

  await fs.chmod(destination, 0o600);
  const backup = new Database(destination, { readonly: true, fileMustExist: true });
  try {
    const integrity = backup.pragma("integrity_check", { simple: true });
    const requiredTables = backup
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'table'
           AND name IN ('products', 'orders', 'artwork_versions', 'audit_logs')`,
      )
      .get() as { count: number };
    if (integrity !== "ok" || requiredTables.count !== 4) {
      throw new Error("O backup foi criado, mas falhou na verificação de integridade.");
    }
  } finally {
    backup.close();
  }

  console.info(`Backup íntegro criado em ${destination}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
