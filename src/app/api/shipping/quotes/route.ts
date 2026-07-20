import { NextResponse } from "next/server";
import { z } from "zod";
import { readCart } from "@/server/cart-context";
import { CommerceRepository, openDatabase } from "@/server/db";
import { domainId, nowIso } from "@/server/db/repository-helpers";
import { getShippingProvider } from "@/server/integrations/shipping-provider";

export const runtime = "nodejs";
const schema = z.object({ postalCode: z.string().regex(/^\D*\d(?:\D*\d){7}\D*$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um CEP válido." }, { status: 422 });
  const current = await readCart();
  if (!current?.lines.length) return NextResponse.json({ error: "Carrinho vazio." }, { status: 409 });
  if (current.lines.some((line) => !line.variant)) return NextResponse.json({ error: "A embalagem do item DTF ainda precisa ser configurada para entrega. Use retirada local por enquanto." }, { status: 409 });
  const originPostalCode = process.env.SHIPPING_ORIGIN_POSTAL_CODE;
  if (!originPostalCode) return NextResponse.json({ error: "O CEP de origem ainda não foi configurado." }, { status: 503 });
  const db = openDatabase();
  try {
    const settings = new CommerceRepository(db).getSettings();
    if (!settings.shippingEnabled) return NextResponse.json({ error: "O cálculo de frete ainda não foi liberado." }, { status: 409 });
    const quotes = await getShippingProvider().quote({ origin: { postalCode: originPostalCode }, destination: { postalCode: parsed.data.postalCode }, items: current.lines.map((line) => ({ referenceId: line.variant!.sku, quantity: line.quantity, unitPriceCents: line.unitPriceCents, weightGrams: line.variant!.weightGrams, widthCm: line.variant!.widthCm, heightCm: line.variant!.heightCm, lengthCm: line.variant!.lengthCm })) });
    const createdAt = nowIso(); const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const stored = quotes.map((quote) => {
      const id = domainId("shipping_quote");
      db.prepare(`INSERT INTO shipping_quotes (id, cart_id, order_id, provider, service_code, service_label, amount_cents, estimated_business_days, payload_json, expires_at, selected, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
        .run(id, current.cart.id, process.env.SHIPPING_PROVIDER === "melhor-envio" ? "melhor-envio" : "mock", quote.serviceCode, quote.label, quote.amountMinor, quote.estimatedBusinessDays, JSON.stringify({ estimatedBusinessDays: quote.estimatedBusinessDays, destinationPostalCode: parsed.data.postalCode.replace(/\D/g, "") }), expiresAt, createdAt);
      return { id, ...quote, expiresAt };
    });
    return NextResponse.json({ quotes: stored });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível calcular o frete." }, { status: 502 });
  } finally { db.close(); }
}
