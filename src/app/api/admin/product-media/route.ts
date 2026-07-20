import { NextResponse } from "next/server";

import { requireStaff } from "@/server/auth/session";
import { storeProductMedia } from "@/server/integrations/product-media-storage";

export const runtime = "nodejs";
const maximumRequestBytes = 9 * 1024 * 1024;

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
      throw new RangeError("O envio completo deve ter até 9 MB.");
    }
    chunks.push(value);
  }
  return new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: Buffer.concat(chunks),
  }).formData();
}

export async function POST(request: Request) {
  await requireStaff(["ADMIN"]);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumRequestBytes) {
    return NextResponse.json({ error: "O envio completo deve ter até 9 MB." }, { status: 413 });
  }
  try {
    const data = await readFormDataWithinLimit(request);
    const file = data.get("media");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
    }
    return NextResponse.json({ media: await storeProductMedia(file) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível enviar a imagem." },
      { status: error instanceof RangeError ? 413 : 400 },
    );
  }
}
