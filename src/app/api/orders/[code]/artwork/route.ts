import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth/auth";
import {
  ArtworkVersionRepository,
  openDatabase,
  OrderRepository,
} from "@/server/db";
import {
  getStoredArtwork,
  markStoredArtworkClaimed,
} from "@/server/integrations/object-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

const requestSchema = z.object({ artworkAssetId: z.uuid() });

export async function POST(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.emailVerified !== true) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecione um arquivo válido." }, { status: 422 });
  }

  if (
    process.env.NODE_ENV === "production" ||
    (process.env.FILE_SCANNER_MODE ?? "mock-signature") !== "mock-signature"
  ) {
    return NextResponse.json(
      { error: "O verificador de segurança dos arquivos ainda não está configurado." },
      { status: 503 },
    );
  }

  const { code } = await context.params;
  const db = openDatabase();

  try {
    const orders = new OrderRepository(db);
    const order = orders.findByCode(code);
    if (!order || order.customerEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    if (!['CHANGES_REQUESTED', 'AUTO_REJECTED'].includes(order.artworkStatus)) {
      return NextResponse.json(
        { error: "Este pedido não está aguardando um novo arquivo." },
        { status: 409 },
      );
    }

    const stored = await getStoredArtwork(parsed.data.artworkAssetId);
    const artworks = new ArtworkVersionRepository(db);
    const claimed = db
      .prepare("SELECT order_id FROM artwork_versions WHERE storage_key = ?")
      .get(stored.storageKey) as { order_id?: string } | undefined;
    if (claimed) {
      if (claimed.order_id === order.id) {
        const existingVersion = artworks
          .listForOrder(order.id)
          .find((candidate) => candidate.storageKey === stored.storageKey);
        if (existingVersion) {
          await markStoredArtworkClaimed(parsed.data.artworkAssetId);
          return NextResponse.json({
            versionId: existingVersion.id,
            version: existingVersion.version,
            orderCode: order.code,
            status: "PENDING_REVIEW",
          });
        }
      }
      return NextResponse.json(
        { error: "Este arquivo já foi vinculado a um pedido." },
        { status: 409 },
      );
    }

    const version = db.transaction(() => {
      const created = artworks.createVersion(
        {
          orderId: order.id,
          storageKey: stored.storageKey,
          originalFilename: stored.originalName,
          mimeType: stored.mediaType,
          sizeBytes: stored.sizeBytes,
          checksumSha256: stored.checksumSha256,
          uploadedBy: session.user.id,
          metadata: {
            detectedType: stored.detectedType,
            validationMode: "homologation-signature-only",
          },
        },
        session.user.id,
      );
      artworks.recordPreflight(
        created.id,
        "PENDING",
        "WARNING",
        {
          validationMode: "homologation-signature-only",
          notice: "Antimalware ainda não integrado. O arquivo permanece sem aprovação de segurança.",
        },
        "mock-file-scanner",
      );
      return created;
    })();
    await markStoredArtworkClaimed(parsed.data.artworkAssetId);

    return NextResponse.json({
      versionId: version.id,
      version: version.version,
      orderCode: order.code,
      status: "PENDING_REVIEW",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível substituir a arte." },
      { status: 422 },
    );
  } finally {
    db.close();
  }
}
