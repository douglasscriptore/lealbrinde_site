import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { fiscalDirectory } from "@/server/runtime-paths";

export type StoredFiscalDocument = {
  storageKey: string;
  originalFilename: string;
  mimeType: "application/pdf";
  sizeBytes: number;
};

const maximumBytes = 5 * 1024 * 1024;

function safeFilename(filename: string) {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function storeFiscalDocumentLocally(
  file: File,
): Promise<StoredFiscalDocument> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O armazenamento fiscal local não pode ser usado em produção.");
  }
  if (file.size <= 0 || file.size > maximumBytes) {
    throw new Error("O documento fiscal deve ser um PDF de até 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Envie um documento PDF válido.");
  }

  await fs.mkdir(fiscalDirectory, { recursive: true });
  const storageKey = `${randomUUID()}.pdf`;
  await fs.writeFile(path.join(fiscalDirectory, storageKey), buffer, {
    flag: "wx",
    mode: 0o600,
  });

  return {
    storageKey,
    originalFilename: safeFilename(file.name),
    mimeType: "application/pdf",
    sizeBytes: file.size,
  };
}

export async function readFiscalDocument(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.pdf$/i.test(storageKey)) {
    throw new Error("Chave privada do documento inválida.");
  }
  return fs.readFile(path.join(fiscalDirectory, storageKey));
}
