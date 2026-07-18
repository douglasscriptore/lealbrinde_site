import type Database from "better-sqlite3";

import type { AuditLog } from "@/domain";

import { mapAuditLog } from "./mappers";
import { asRows } from "./repository-helpers";

export class AuditRepository {
  constructor(private readonly db: Database.Database) {}

  listForEntity(entityType: string, entityId: string): AuditLog[] {
    return asRows(
      this.db
        .prepare(
          `SELECT * FROM audit_logs
           WHERE entity_type = ? AND entity_id = ?
           ORDER BY created_at DESC`,
        )
        .all(entityType, entityId),
    ).map(mapAuditLog);
  }

  listRecent(limit = 100): AuditLog[] {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    return asRows(
      this.db
        .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?")
        .all(safeLimit),
    ).map(mapAuditLog);
  }
}
