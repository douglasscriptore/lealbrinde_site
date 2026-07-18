import type Database from "better-sqlite3";

import type {
  ArtworkReviewStatus,
  ArtworkVersion,
  FileScanStatus,
  FiscalDocument,
  FiscalDocumentType,
  PaymentAttempt,
  PaymentAttemptStatus,
  PreflightStatus,
} from "@/domain";

import { mapArtworkVersion, mapFiscalDocument, mapPaymentAttempt } from "./mappers";
import { OrderRepository } from "./order-repository";
import { asRow, asRows, domainId, nowIso, writeAudit } from "./repository-helpers";

export function isArtworkReadyForHumanReview(version: ArtworkVersion): boolean {
  if (version.scanStatus === "CLEAN") return true;
  return (
    process.env.NODE_ENV !== "production" &&
    version.scanStatus === "PENDING" &&
    version.metadata.validationMode === "homologation-signature-only"
  );
}

export class PaymentAttemptRepository {
  private readonly orders: OrderRepository;

  constructor(private readonly db: Database.Database) {
    this.orders = new OrderRepository(db);
  }

  create(
    input: {
      orderId: string;
      provider: string;
      providerReference: string;
      idempotencyKey: string;
      amountCents: number;
      expiresAt: string | null;
      metadata?: Record<string, unknown>;
    },
    actorId = "system",
  ): PaymentAttempt {
    const existing = this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (
        existing.orderId !== input.orderId ||
        existing.amountCents !== input.amountCents
      ) {
        throw new Error("A chave de idempotência já foi usada em outro pagamento.");
      }
      return existing;
    }

    const order = this.orders.findById(input.orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("O valor do pagamento é inválido.");
    }
    if (input.amountCents !== order.priceSnapshot.subtotalCents) {
      throw new Error("O valor do Pix não corresponde ao snapshot do pedido.");
    }
    if (!['PENDING_REVIEW', 'APPROVED'].includes(order.artworkStatus)) {
      throw new Error("O Pix só pode ser criado após a validação mínima do arquivo.");
    }

    const id = domainId("payment_attempt");
    const timestamp = nowIso();
    try {
      this.db.transaction(() => {
        this.db
          .prepare(
            `INSERT INTO payment_attempts (
              id, order_id, provider, provider_reference, idempotency_key,
              amount_cents, currency, status, expires_at, metadata_json,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'BRL', 'PENDING', ?, ?, ?, ?)`,
          )
          .run(
            id,
            input.orderId,
            input.provider,
            input.providerReference,
            input.idempotencyKey,
            input.amountCents,
            input.expiresAt,
            JSON.stringify(input.metadata ?? {}),
            timestamp,
            timestamp,
          );
        this.orders.updateStatuses(
          input.orderId,
          { paymentStatus: "PENDING_PIX" },
          actorId,
        );
        writeAudit(this.db, {
          actorId,
          action: "PAYMENT_ATTEMPT_CREATED",
          entityType: "PaymentAttempt",
          entityId: id,
          after: {
            orderId: input.orderId,
            provider: input.provider,
            amountCents: input.amountCents,
          },
        });
      })();
    } catch (error) {
      const concurrent = this.findByIdempotencyKey(input.idempotencyKey);
      if (
        concurrent &&
        concurrent.orderId === input.orderId &&
        concurrent.amountCents === input.amountCents
      ) {
        return concurrent;
      }
      throw error;
    }
    return this.requireAttempt(id);
  }

  listForOrder(orderId: string): PaymentAttempt[] {
    return asRows(
      this.db
        .prepare(
          "SELECT * FROM payment_attempts WHERE order_id = ? ORDER BY created_at DESC",
        )
        .all(orderId),
    ).map(mapPaymentAttempt);
  }

  findByProviderReference(
    provider: string,
    providerReference: string,
  ): PaymentAttempt | null {
    const row = asRow(
      this.db
        .prepare(
          "SELECT * FROM payment_attempts WHERE provider = ? AND provider_reference = ?",
        )
        .get(provider, providerReference),
    );
    return row ? mapPaymentAttempt(row) : null;
  }

  findByIdempotencyKey(idempotencyKey: string): PaymentAttempt | null {
    const row = asRow(
      this.db
        .prepare("SELECT * FROM payment_attempts WHERE idempotency_key = ?")
        .get(idempotencyKey),
    );
    return row ? mapPaymentAttempt(row) : null;
  }

  transition(
    attemptId: string,
    status: PaymentAttemptStatus,
    actorId = "payment-webhook",
    metadata: Record<string, unknown> = {},
  ): PaymentAttempt {
    const current = this.requireAttempt(attemptId);
    if (current.status === status) return current;
    const allowed: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
      PENDING: ["PAID", "EXPIRED", "FAILED"],
      PAID: ["REFUNDED"],
      EXPIRED: ["PAID"],
      FAILED: [],
      REFUNDED: [],
    };
    if (!allowed[current.status].includes(status)) {
      throw new Error(`Transição de pagamento inválida: ${current.status} para ${status}.`);
    }

    const timestamp = nowIso();

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE payment_attempts
           SET status = ?, metadata_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          status,
          JSON.stringify({ ...current.metadata, ...metadata }),
          timestamp,
          attemptId,
        );
      const orderPaymentStatus = this.aggregateOrderPaymentStatus(current.orderId);
      this.orders.updateStatuses(
        current.orderId,
        { paymentStatus: orderPaymentStatus },
        actorId,
      );
      writeAudit(this.db, {
        actorId,
        action: "PAYMENT_STATUS_CHANGED",
        entityType: "PaymentAttempt",
        entityId: attemptId,
        before: { status: current.status },
        after: { status },
      });
    })();
    return this.requireAttempt(attemptId);
  }

  private requireAttempt(attemptId: string): PaymentAttempt {
    const row = asRow(
      this.db.prepare("SELECT * FROM payment_attempts WHERE id = ?").get(attemptId),
    );
    if (!row) throw new Error("Tentativa de pagamento não encontrada.");
    return mapPaymentAttempt(row);
  }

  private aggregateOrderPaymentStatus(orderId: string) {
    const statuses = asRows(
      this.db.prepare("SELECT status FROM payment_attempts WHERE order_id = ?").all(orderId),
    ).map((row) => String(row.status));

    if (statuses.includes("PAID")) return "PAID" as const;
    if (statuses.includes("PENDING")) return "PENDING_PIX" as const;
    if (statuses.includes("REFUNDED")) return "REFUNDED" as const;
    if (statuses.includes("FAILED")) return "FAILED" as const;
    return "EXPIRED" as const;
  }
}

export class ArtworkVersionRepository {
  private readonly orders: OrderRepository;

  constructor(private readonly db: Database.Database) {
    this.orders = new OrderRepository(db);
  }

  createVersion(
    input: {
      orderId: string;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      checksumSha256: string;
      uploadedBy: string;
      metadata?: Record<string, unknown>;
    },
    actorId = input.uploadedBy,
  ): ArtworkVersion {
    const order = this.orders.findById(input.orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    assertPrivateFileMetadata(input.storageKey, input.sizeBytes);
    if (!/^[a-f0-9]{64}$/i.test(input.checksumSha256)) {
      throw new Error("O checksum SHA-256 do arquivo é inválido.");
    }

    const nextVersion = Number(
      (
        asRow(
          this.db
            .prepare(
              "SELECT COALESCE(MAX(version), 0) AS version FROM artwork_versions WHERE order_id = ?",
            )
            .get(input.orderId),
        ) ?? { version: 0 }
      ).version,
    ) + 1;
    const id = domainId("artwork");
    const timestamp = nowIso();

    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO artwork_versions (
            id, order_id, version, storage_key, original_filename, mime_type,
            size_bytes, checksum_sha256, scan_status, preflight_status,
            review_status, review_note, reviewed_by, reviewed_at,
            uploaded_by, metadata_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING',
                    'PENDING', NULL, NULL, NULL, ?, ?, ?)`,
        )
        .run(
          id,
          input.orderId,
          nextVersion,
          input.storageKey,
          input.originalFilename,
          input.mimeType,
          input.sizeBytes,
          input.checksumSha256.toLowerCase(),
          input.uploadedBy,
          JSON.stringify(input.metadata ?? {}),
          timestamp,
        );
      this.orders.updateStatuses(
        input.orderId,
        { artworkStatus: "QUARANTINED", productionStatus: "BLOCKED" },
        actorId,
      );
      writeAudit(this.db, {
        actorId,
        action: "ARTWORK_VERSION_CREATED",
        entityType: "ArtworkVersion",
        entityId: id,
        after: { orderId: input.orderId, version: nextVersion },
      });
    })();
    return this.requireVersion(id);
  }

  listForOrder(orderId: string): ArtworkVersion[] {
    return asRows(
      this.db
        .prepare(
          "SELECT * FROM artwork_versions WHERE order_id = ? ORDER BY version DESC",
        )
        .all(orderId),
    ).map(mapArtworkVersion);
  }

  findById(versionId: string): ArtworkVersion | null {
    const row = asRow(
      this.db.prepare("SELECT * FROM artwork_versions WHERE id = ?").get(versionId),
    );
    return row ? mapArtworkVersion(row) : null;
  }

  recordPreflight(
    versionId: string,
    scanStatus: FileScanStatus,
    preflightStatus: PreflightStatus,
    metadata: Record<string, unknown>,
    actorId = "file-scanner",
  ): ArtworkVersion {
    const version = this.requireVersion(versionId);
    const reviewableInCurrentEnvironment = isArtworkReadyForHumanReview({
      ...version,
      scanStatus,
      preflightStatus,
      metadata: { ...version.metadata, ...metadata },
    });
    const orderArtworkStatus =
      reviewableInCurrentEnvironment && ["PASSED", "WARNING"].includes(preflightStatus)
        ? "PENDING_REVIEW"
        : scanStatus === "PENDING"
          ? "QUARANTINED"
          : "AUTO_REJECTED";

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE artwork_versions
           SET scan_status = ?, preflight_status = ?, metadata_json = ?
           WHERE id = ?`,
        )
        .run(
          scanStatus,
          preflightStatus,
          JSON.stringify({ ...version.metadata, ...metadata }),
          versionId,
        );
      this.orders.updateStatuses(
        version.orderId,
        { artworkStatus: orderArtworkStatus },
        actorId,
      );
      writeAudit(this.db, {
        actorId,
        action: "ARTWORK_PREFLIGHT_RECORDED",
        entityType: "ArtworkVersion",
        entityId: versionId,
        after: { scanStatus, preflightStatus },
      });
    })();
    return this.requireVersion(versionId);
  }

  review(
    versionId: string,
    status: Exclude<ArtworkReviewStatus, "PENDING">,
    note: string | null,
    actorId: string,
    metadataPatch: Record<string, unknown> = {},
  ): ArtworkVersion {
    const version = this.requireVersion(versionId);
    const latest = this.listForOrder(version.orderId)[0];
    if (!latest || latest.id !== version.id) {
      throw new Error("Somente a versão mais recente da arte pode ser revisada.");
    }
    if (version.reviewStatus !== "PENDING") {
      throw new Error("Esta versão da arte já recebeu uma decisão.");
    }
    if (!isArtworkReadyForHumanReview(version)) {
      throw new Error("A arte precisa passar pela verificação de segurança.");
    }
    if (status === "CHANGES_REQUESTED" && !note?.trim()) {
      throw new Error("Explique a alteração necessária para o cliente.");
    }

    const artworkStatus = {
      APPROVED: "APPROVED",
      CHANGES_REQUESTED: "CHANGES_REQUESTED",
      REJECTED: "AUTO_REJECTED",
    } as const;
    const timestamp = nowIso();
    this.db.transaction(() => {
      const result = this.db
        .prepare(
          `UPDATE artwork_versions
           SET review_status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?,
               metadata_json = ?
           WHERE id = ? AND review_status = 'PENDING'`,
        )
        .run(
          status,
          note,
          actorId,
          timestamp,
          JSON.stringify({ ...version.metadata, ...metadataPatch }),
          versionId,
        );
      if (result.changes !== 1) {
        throw new Error("Esta versão da arte já recebeu uma decisão.");
      }
      this.orders.updateStatuses(
        version.orderId,
        { artworkStatus: artworkStatus[status] },
        actorId,
      );
      writeAudit(this.db, {
        actorId,
        action: "ARTWORK_REVIEWED",
        entityType: "ArtworkVersion",
        entityId: versionId,
        before: { reviewStatus: version.reviewStatus },
        after: {
          reviewStatus: status,
          note,
          metadataKeys: Object.keys(metadataPatch),
        },
      });
    })();
    return this.requireVersion(versionId);
  }

  private requireVersion(versionId: string): ArtworkVersion {
    const version = this.findById(versionId);
    if (!version) throw new Error("Versão da arte não encontrada.");
    return version;
  }
}

export class FiscalDocumentRepository {
  constructor(private readonly db: Database.Database) {}

  add(
    input: {
      orderId: string;
      type: FiscalDocumentType;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      uploadedBy: string;
      metadata?: Record<string, unknown>;
    },
    actorId = input.uploadedBy,
  ): FiscalDocument {
    const orderExists = this.db
      .prepare("SELECT 1 FROM orders WHERE id = ?")
      .get(input.orderId);
    if (!orderExists) throw new Error("Pedido não encontrado.");
    assertPrivateFileMetadata(input.storageKey, input.sizeBytes);

    const latest = asRow(
      this.db
        .prepare(
          `SELECT COALESCE(MAX(version), 0) AS version
           FROM fiscal_documents WHERE order_id = ? AND document_type = ?`,
        )
        .get(input.orderId, input.type),
    );
    const version = Number(latest?.version ?? 0) + 1;
    const id = domainId("fiscal_document");
    const timestamp = nowIso();

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE fiscal_documents SET is_current = 0
           WHERE order_id = ? AND document_type = ? AND is_current = 1`,
        )
        .run(input.orderId, input.type);
      this.db
        .prepare(
          `INSERT INTO fiscal_documents (
            id, order_id, document_type, version, storage_key,
            original_filename, mime_type, size_bytes, is_current,
            uploaded_by, metadata_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          id,
          input.orderId,
          input.type,
          version,
          input.storageKey,
          input.originalFilename,
          input.mimeType,
          input.sizeBytes,
          input.uploadedBy,
          JSON.stringify(input.metadata ?? {}),
          timestamp,
        );
      writeAudit(this.db, {
        actorId,
        action: "FISCAL_DOCUMENT_ADDED",
        entityType: "FiscalDocument",
        entityId: id,
        after: { orderId: input.orderId, type: input.type, version },
      });
    })();
    return this.requireDocument(id);
  }

  listForOrder(orderId: string): FiscalDocument[] {
    return asRows(
      this.db
        .prepare(
          `SELECT * FROM fiscal_documents
           WHERE order_id = ? ORDER BY document_type, version DESC`,
        )
        .all(orderId),
    ).map(mapFiscalDocument);
  }

  currentForOrder(
    orderId: string,
    type?: FiscalDocumentType,
  ): FiscalDocument[] {
    const rows = type
      ? this.db
          .prepare(
            `SELECT * FROM fiscal_documents
             WHERE order_id = ? AND document_type = ? AND is_current = 1`,
          )
          .all(orderId, type)
      : this.db
          .prepare(
            `SELECT * FROM fiscal_documents
             WHERE order_id = ? AND is_current = 1`,
          )
          .all(orderId);
    return asRows(rows).map(mapFiscalDocument);
  }

  findById(documentId: string): FiscalDocument | null {
    const row = asRow(
      this.db.prepare("SELECT * FROM fiscal_documents WHERE id = ?").get(documentId),
    );
    return row ? mapFiscalDocument(row) : null;
  }

  private requireDocument(documentId: string): FiscalDocument {
    const document = this.findById(documentId);
    if (!document) throw new Error("Documento fiscal não encontrado.");
    return document;
  }
}

function assertPrivateFileMetadata(storageKey: string, sizeBytes: number): void {
  if (!storageKey.trim() || /^https?:\/\//i.test(storageKey)) {
    throw new Error("Informe uma chave privada de armazenamento, não uma URL pública.");
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error("O tamanho do arquivo é inválido.");
  }
}
