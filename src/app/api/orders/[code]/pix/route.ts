import { NextResponse } from "next/server";

import { auth } from "@/server/auth/auth";
import { openDatabase, OrderRepository } from "@/server/db";
import { ensurePixPayment } from "@/server/services/order-payment";

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
  if (!session || session.user.emailVerified !== true) {
    return NextResponse.json({ error: "Verifique seu e-mail antes de gerar o Pix." }, { status: 401 });
  }

  const { code } = await context.params;
  const db = openDatabase();
  const order = new OrderRepository(db).findByCode(code);
  db.close();

  if (!order || order.customerEmail.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  try {
    const payment = await ensurePixPayment(order, session.user.email);
    return NextResponse.json({
      status: "payment_created",
      orderCode: order.code,
      payment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o Pix." },
      { status: 422 },
    );
  }
}
