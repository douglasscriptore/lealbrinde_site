import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type ProductImageType = "PNG" | "JPEG" | "WEBP" | "AVIF";

const maxBytes = 8 * 1024 * 1024;

function detectImage(buffer: Buffer): { type: ProductImageType; extension: string } | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: "PNG", extension: "png" };
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return { type: "JPEG", extension: "jpg" };
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { type: "WEBP", extension: "webp" };
  }
  if (buffer.subarray(4, 12).toString("ascii").includes("ftypavif")) {
    return { type: "AVIF", extension: "avif" };
  }
  return null;
}

function storageConfiguration(): { directory: string; publicBaseUrl: string } {
  const configuredDirectory = process.env.PRODUCT_MEDIA_DIRECTORY?.trim();
  const configuredBaseUrl = process.env.PRODUCT_MEDIA_PUBLIC_BASE_URL?.trim();
  if (configuredDirectory && configuredBaseUrl) {
    return {
      directory: path.resolve(configuredDirectory),
      publicBaseUrl: configuredBaseUrl.replace(/\/$/, ""),
    };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Configure PRODUCT_MEDIA_DIRECTORY e PRODUCT_MEDIA_PUBLIC_BASE_URL para enviar imagens em produção.");
  }
  return {
    directory: path.join(process.cwd(), "public", "images", "catalog"),
    publicBaseUrl: "/images/catalog",
  };
}

export async function storeProductMedia(file: File): Promise<{
  url: string;
  detectedType: ProductImageType;
  sizeBytes: number;
}> {
  if (file.size <= 0 || file.size > maxBytes) throw new Error("A imagem deve ter até 8 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(buffer);
  if (!detected) throw new Error("Envie uma imagem PNG, JPEG, WebP ou AVIF válida.");
  const { directory, publicBaseUrl } = storageConfiguration();
  await fs.mkdir(directory, { recursive: true });
  const filename = `product-${randomUUID()}.${detected.extension}`;
  await fs.writeFile(path.join(directory, filename), buffer, { flag: "wx", mode: 0o644 });
  return {
    url: `${publicBaseUrl}/${filename}`,
    detectedType: detected.type,
    sizeBytes: file.size,
  };
}
