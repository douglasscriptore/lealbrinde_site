import { NextResponse } from "next/server";

import type { AppRole } from "@/server/auth/session";
import { auth } from "@/server/auth/auth";
import {
  FiscalDocumentRepository,
  openDatabase,
  OrderRepository,
} from "@/server/db";
import { storeFiscalDocumentLocally } from "@/server/integrations/fiscal-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  const role = ((session.user as typeof session.user & { role?: AppRole }).role ??
    "CUSTOMER") as AppRole;
  const mfaEnabled = Boolean(
    (session.user as typeof session.user & { twoFactorEnabled?: boolean })
      .twoFactorEnabled,
  );
  if (
    session.user.emailVerified !== true ||
    !mfaEnabled ||
    !["FINANCE", "ADMIN"].includes(role)
  ) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const data = await request.formData();
  const file = data.get("document");
  const documentType = data.get("documentType");
  if (!(file instanceof File) || !["INVOICE", "RECEIPT"].includes(String(documentType))) {
    return NextResponse.json(
      { error: "Selecione o tipo e um documento PDF." },
      { status: 422 },
    );
  }

  const { code } = await context.params;
  const db = openDatabase();

  try {
    const order = new OrderRepository(db).findByCode(code);
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    const stored = await storeFiscalDocumentLocally(file);
    const document = new FiscalDocumentRepository(db).add(
      {
        orderId: order.id,
        type: String(documentType) as "INVOICE" | "RECEIPT",
        ...stored,
        uploadedBy: session.user.id,
        metadata: { storageMode: "local-development" },
      },
      session.user.id,
    );

    return NextResponse.json({
      id: document.id,
      type: document.type,
      version: document.version,
      orderCode: order.code,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível anexar o documento." },
      { status: 422 },
    );
  } finally {
    db.close();
  }
}
