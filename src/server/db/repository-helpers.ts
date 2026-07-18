import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

export function domainId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function writeAudit(
  db: Database.Database,
  input: {
    id?: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    createdAt?: string;
  },
): void {
  db.prepare(
    `INSERT INTO audit_logs (
      id, actor_id, action, entity_type, entity_id,
      before_json, after_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id ?? domainId("audit"),
    input.actorId,
    input.action,
    input.entityType,
    input.entityId,
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.createdAt ?? nowIso(),
  );
}

export function asRows(value: unknown): Array<Record<string, unknown>> {
  return value as Array<Record<string, unknown>>;
}

export function asRow(value: unknown): Record<string, unknown> | null {
  return (value as Record<string, unknown> | undefined) ?? null;
}
