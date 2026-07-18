import { NextResponse } from "next/server";

import type { AppRole } from "@/server/auth/session";
import { auth } from "@/server/auth/auth";
import {
  FiscalDocumentRepository,
  openDatabase,
  OrderRepository,
} from "@/server/db";
import { readFiscalDocument } from "@/server/integrations/fiscal-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string; documentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  const { code, documentId } = await context.params;
  const db = openDatabase();

  try {
    const order = new OrderRepository(db).findByCode(code);
    const role = ((session.user as typeof session.user & { role?: AppRole }).role ??
      "CUSTOMER") as AppRole;
    const staff =
      session.user.emailVerified === true &&
      Boolean(
        (session.user as typeof session.user & { twoFactorEnabled?: boolean })
          .twoFactorEnabled,
      ) &&
      ["FINANCE", "ADMIN"].includes(role);
    const verifiedOwner =
      session.user.emailVerified === true &&
      order?.customerEmail.toLowerCase() === session.user.email.toLowerCase();
    if (!order || (!staff && !verifiedOwner)) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    const document = new FiscalDocumentRepository(db)
      .listForOrder(order.id)
      .find((candidate) => candidate.id === documentId);
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    const data = await readFiscalDocument(document.storageKey);
    const encodedName = encodeURIComponent(document.originalFilename);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="documento-fiscal.pdf"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  } finally {
    db.close();
  }
}
