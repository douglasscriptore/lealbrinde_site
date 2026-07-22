import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/server/auth/session";
import { clearCartCookie, readCart } from "@/server/cart-context";
import { createCommerceOrder } from "@/server/services/commerce-order";
import { isLealBrindeApiConfigured, proxyToLealBrindeApi } from "@/server/api/lealbrinde-api";

export const runtime = "nodejs";

const address = z.object({
  postalCode: z.string().regex(/^\D*\d(?:\D*\d){7}\D*$/),
  street: z.string().trim().min(2), number: z.string().trim().min(1),
  complement: z.string().trim(), neighborhood: z.string().trim().min(1),
  city: z.string().trim().min(2), state: z.string().trim().length(2),
});
const schema = z.object({
  contact: z.object({
    name: z.string().trim().min(3),
    phone: z.string().trim().min(8),
    document: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().regex(/^(\d{11}|\d{14})$/, "Informe um CPF ou CNPJ válido.")),
  }),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
  installments: z.number().int().min(1).max(12).default(1),
  cardToken: z.string().min(8).optional(),
  cardPaymentMethodId: z.string().trim().min(1).optional(),
  fulfillment: z.object({ method: z.enum(["PICKUP", "SHIPPING"]), address: address.nullable(), shippingQuoteId: z.string().nullable() }),
  fiscal: z.object({ requested: z.boolean(), partyType: z.enum(["PF", "PJ"]).nullable(), document: z.string().trim().nullable(), legalName: z.string().trim().nullable() }),
  acceptedTerms: z.literal(true),
}).superRefine((value, context) => {
  if (value.fulfillment.method === "SHIPPING" && (!value.fulfillment.address || !value.fulfillment.shippingQuoteId)) context.addIssue({ code: "custom", path: ["fulfillment"], message: "Selecione um frete e informe o endereço." });
  if (value.paymentMethod === "CREDIT_CARD" && (!value.cardToken || !value.cardPaymentMethodId)) context.addIssue({ code: "custom", path: ["cardToken"], message: "Tokenize o cartão antes de pagar." });
  if (value.fiscal.requested && (!value.fiscal.partyType || !value.fiscal.document || !value.fiscal.legalName)) {
    context.addIssue({ code: "custom", path: ["fiscal"], message: "Preencha os dados fiscais obrigatórios." });
  }
  if (value.fiscal.requested && value.fiscal.document && value.fiscal.partyType) {
    const digits = value.fiscal.document.replace(/\D/g, "");
    const expectedLength = value.fiscal.partyType === "PF" ? 11 : 14;
    if (digits.length !== expectedLength) {
      context.addIssue({
        code: "custom",
        path: ["fiscal", "document"],
        message: value.fiscal.partyType === "PF" ? "Informe um CPF válido para a nota fiscal." : "Informe um CNPJ válido para a nota fiscal.",
      });
    }
  }
});

export async function POST(request: Request) {
  if (isLealBrindeApiConfigured()) return proxyToLealBrindeApi(request, "/v1/checkout");
  const session = await getCurrentSession();
  if (!session || session.user.emailVerified !== true) return NextResponse.json({ error: "Acesse sua conta para finalizar a compra.", loginRequired: true }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revise o checkout." }, { status: 422 });
  const current = await readCart();
  if (!current?.lines.length) return NextResponse.json({ error: "O carrinho está vazio." }, { status: 409 });
  try {
    const result = await createCommerceOrder({
      cart: current.cart, lines: current.lines,
      customer: { id: session.user.id, name: parsed.data.contact.name, email: session.user.email, phone: parsed.data.contact.phone, document: parsed.data.contact.document },
      paymentMethod: parsed.data.paymentMethod, installments: parsed.data.installments,
      cardToken: parsed.data.cardToken,
      cardPaymentMethodId: parsed.data.cardPaymentMethodId,
      fulfillment: parsed.data.fulfillment,
      fiscal: parsed.data.fiscal,
    });
    await clearCartCookie();
    return NextResponse.json({ status: result.payment.status === "PAID" ? "paid" : "payment_pending", orderCode: result.orderCode, payment: result.payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar o pedido." }, { status: 409 });
  }
}
