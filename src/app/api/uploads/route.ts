import { NextResponse } from "next/server";
import { storeArtworkLocally } from "@/server/integrations/object-storage";

export const runtime = "nodejs";

const maximumRequestBytes = 11 * 1024 * 1024;
const rateLimitWindowMs = 10 * 60 * 1000;
const maximumUploadsPerWindow = 12;

type UploadBucket = { count: number; startedAt: number };
const uploadState = globalThis as typeof globalThis & {
  lealBrindeUploadBuckets?: Map<string, UploadBucket>;
};
const uploadBuckets =
  uploadState.lealBrindeUploadBuckets ?? new Map<string, UploadBucket>();
uploadState.lealBrindeUploadBuckets = uploadBuckets;

function clientIdentifier(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local-client"
  );
}

function consumeUploadAllowance(request: Request): number | null {
  const now = Date.now();
  const key = clientIdentifier(request);
  const current = uploadBuckets.get(key);
  if (!current || now - current.startedAt >= rateLimitWindowMs) {
    uploadBuckets.set(key, { count: 1, startedAt: now });
    return null;
  }
  if (current.count >= maximumUploadsPerWindow) {
    return Math.max(1, Math.ceil((rateLimitWindowMs - (now - current.startedAt)) / 1000));
  }
  current.count += 1;
  return null;
}

async function readFormDataWithinLimit(request: Request): Promise<FormData> {
  if (!request.body) throw new Error("O envio está vazio.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maximumRequestBytes) {
      await reader.cancel();
      throw new RangeError("O envio completo deve ter até 11 MB.");
    }
    chunks.push(value);
  }

  const boundedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: Buffer.concat(chunks),
  });
  return boundedRequest.formData();
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "O armazenamento privado de arquivos ainda não está configurado." },
      { status: 503 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Origem da requisição não permitida." },
      { status: 403 },
    );
  }

  const retryAfter = consumeUploadAllowance(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Muitos arquivos enviados. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) {
      return NextResponse.json(
        { error: "O envio completo deve ter até 11 MB." },
        { status: 413 },
      );
    }
    const data = await readFormDataWithinLimit(request);
    const file = data.get("artwork");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecione um arquivo para enviar." }, { status: 400 });
    }

    const stored = await storeArtworkLocally(file);
    return NextResponse.json({
      asset: stored,
      notice: "Arquivo recebido para homologação. A aprovação continuará sendo humana.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível receber o arquivo.";
    return NextResponse.json(
      { error: message },
      { status: error instanceof RangeError ? 413 : 400 },
    );
  }
}
