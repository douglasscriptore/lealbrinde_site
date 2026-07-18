import "server-only";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "../runtime-paths";

export type AcceptedArtworkType = "PNG" | "PDF" | "TIFF";

export type StoredArtwork = {
  assetId: string;
  storageKey: string;
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  detectedType: AcceptedArtworkType;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  scanStatus: "NOT_CONFIGURED";
  preflightSeverity: "human_review_required";
};

const provisionalMaxBytes = 10 * 1024 * 1024;
const localStorageQuotaBytes = 250 * 1024 * 1024;
const unclaimedLifetimeMs = 24 * 60 * 60 * 1000;

async function removeExpiredUnclaimedArtwork(): Promise<void> {
  await fs.mkdir(uploadDirectory, { recursive: true });
  const filenames = await fs.readdir(uploadDirectory);
  await Promise.all(
    filenames
      .filter((filename) => /^[0-9a-f-]{36}\.json$/i.test(filename))
      .map(async (filename) => {
        try {
          const metadataPath = path.join(uploadDirectory, filename);
          const metadata = JSON.parse(
            await fs.readFile(metadataPath, "utf8"),
          ) as Partial<StoredArtwork>;
          if (
            metadata.claimedAt ||
            !metadata.expiresAt ||
            new Date(metadata.expiresAt).getTime() > Date.now()
          ) {
            return;
          }
          await Promise.allSettled([
            fs.unlink(metadataPath),
            metadata.storageKey
              ? fs.unlink(path.join(uploadDirectory, metadata.storageKey))
              : Promise.resolve(),
          ]);
        } catch {
          // Metadados legados ou incompletos são preservados para revisão manual.
        }
      }),
  );
}

async function currentLocalStorageBytes(): Promise<number> {
  const filenames = await fs.readdir(uploadDirectory);
  const sizes = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".bin"))
      .map(async (filename) =>
        (await fs.stat(path.join(uploadDirectory, filename))).size,
      ),
  );
  return sizes.reduce((total, size) => total + size, 0);
}

function detectArtworkType(buffer: Buffer): AcceptedArtworkType | null {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(png)) return "PNG";
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "PDF";

  const littleEndianTiff = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
  const bigEndianTiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
  if (buffer.subarray(0, 4).equals(littleEndianTiff) || buffer.subarray(0, 4).equals(bigEndianTiff)) {
    return "TIFF";
  }

  return null;
}

function safeOriginalName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function storeArtworkLocally(file: File): Promise<StoredArtwork> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O armazenamento local não pode receber arquivos em produção.");
  }

  if (file.size <= 0 || file.size > provisionalMaxBytes) {
    throw new Error("O arquivo de homologação deve ter até 10 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectArtworkType(buffer);
  if (!detectedType) {
    throw new Error("Envie um arquivo PNG, PDF ou TIFF válido.");
  }

  await removeExpiredUnclaimedArtwork();
  const currentBytes = await currentLocalStorageBytes();
  if (currentBytes + file.size > localStorageQuotaBytes) {
    throw new Error(
      "O armazenamento local de homologação atingiu o limite. Remova uploads órfãos antes de continuar.",
    );
  }
  const assetId = randomUUID();
  const storageKey = `${assetId}.bin`;
  await fs.writeFile(path.join(uploadDirectory, storageKey), buffer, { flag: "wx", mode: 0o600 });

  const createdAt = new Date();

  const stored: StoredArtwork = {
    assetId,
    storageKey,
    originalName: safeOriginalName(file.name),
    mediaType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    detectedType,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + unclaimedLifetimeMs).toISOString(),
    claimedAt: null,
    scanStatus: "NOT_CONFIGURED",
    preflightSeverity: "human_review_required",
  };

  try {
    await fs.writeFile(
      path.join(uploadDirectory, `${assetId}.json`),
      JSON.stringify(stored),
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    await fs.unlink(path.join(uploadDirectory, storageKey)).catch(() => undefined);
    throw error;
  }

  return stored;
}

export async function getStoredArtwork(assetId: string): Promise<StoredArtwork> {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
    throw new Error("Identificador do arquivo inválido.");
  }

  const metadata = await fs.readFile(path.join(uploadDirectory, `${assetId}.json`), "utf8");
  const stored = JSON.parse(metadata) as StoredArtwork;
  if (
    !stored.claimedAt &&
    stored.expiresAt &&
    new Date(stored.expiresAt).getTime() <= Date.now()
  ) {
    throw new Error("O envio expirou. Selecione o arquivo novamente.");
  }
  return stored;
}

export async function markStoredArtworkClaimed(assetId: string): Promise<void> {
  const stored = await getStoredArtwork(assetId);
  if (stored.claimedAt) return;
  const metadataPath = path.join(uploadDirectory, `${assetId}.json`);
  const temporaryPath = `${metadataPath}.${randomUUID()}.tmp`;
  await fs.writeFile(
    temporaryPath,
    JSON.stringify({ ...stored, claimedAt: new Date().toISOString() }),
    { flag: "wx", mode: 0o600 },
  );
  await fs.rename(temporaryPath, metadataPath);
}

export async function readStoredArtwork(storageKey: string): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}\.bin$/i.test(storageKey)) {
    throw new Error("Chave privada do arquivo inválida.");
  }

  return fs.readFile(path.join(uploadDirectory, storageKey));
}
