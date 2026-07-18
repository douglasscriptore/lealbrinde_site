import { mkdirSync } from "node:fs";

import Database from "better-sqlite3";

import { dataDirectory, databasePath } from "@/server/runtime-paths";

import { migrateDatabase } from "./schema";

export function openDatabase(filename: string = databasePath): Database.Database {
  if (filename !== ":memory:") {
    mkdirSync(filename === databasePath ? dataDirectory : getParent(filename), {
      recursive: true,
    });
  }

  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  if (filename !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  migrateDatabase(db);
  return db;
}

function getParent(filename: string): string {
  const separator = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  return separator === -1 ? "." : filename.slice(0, separator);
}
