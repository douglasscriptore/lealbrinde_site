import { NextResponse } from "next/server";
import { z } from "zod";

import { allowedPaymentMethods } from "@/domain";
import { getCurrentSession } from "@/server/auth/session";
import { ensureCartCookie, readCart } from "@/server/cart-context";
import { CommerceRepository, openDatabase } from "@/server/db";
import { getStoredArtwork } from "@/server/integrations/object-storage";

export const runtime = "nodejs";

const itemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().positive(),
  customization: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  artworkAssetId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

function serialize(lines: NonNullable<Awaited<ReturnType<typeof readCart>>>["lines"], cardEnabled: boolean) {
  const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
  return {
    items: lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.product.name,
      productSlug: line.product.slug,
      productType: line.product.type,
      imageUrl: line.product.mainImageUrl,
      variantId: line.variantId,
      sku: line.variant?.sku ?? null,
      options: line.variant?.optionValues ?? {},
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      personalizationCents: line.personalizationCents,
      totalCents: line.totalCents,
    })),
    subtotalCents,
    paymentMethods: allowedPaymentMethods(lines.map((line) => line.product.type), cardEnabled),
  };
}

export async function GET() {
  const current = await readCart();
  if (!current) return NextResponse.json({ items: [], subtotalCents: 0, paymentMethods: ["PIX"] });
  const db = openDatabase();
  try {
    return NextResponse.json(serialize(current.lines, new CommerceRepository(db).getSettings().cardEnabled));
  } finally {
    db.close();
  }
}

export async function POST(request: Request) {
  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Item inválido." }, { status: 422 });
  }
  if (parsed.data.artworkAssetId) {
    try {
      await getStoredArtwork(parsed.data.artworkAssetId);
    } catch {
      return NextResponse.json({ error: "O arquivo enviado não foi encontrado. Envie-o novamente." }, { status: 422 });
    }
  }
  const { tokenHash } = await ensureCartCookie();
  const session = await getCurrentSession();
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    const cart = commerce.getOrCreateCart(
      tokenHash,
      session?.user.emailVerified ? { id: session.user.id, email: session.user.email } : undefined,
    );
    commerce.upsertCartItem(cart.id, {
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
      quantity: parsed.data.quantity,
      customization: parsed.data.customization,
      artworkAssetId: parsed.data.artworkAssetId ?? null,
    });
    const updated = commerce.findCartByTokenHash(tokenHash)!;
    return NextResponse.json(serialize(commerce.cartLines(updated), commerce.getSettings().cardEnabled), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível adicionar o item." }, { status: 409 });
  } finally {
    db.close();
  }
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Quantidade inválida." }, { status: 422 });
  const current = await readCart();
  if (!current) return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 404 });
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    commerce.updateCartItemQuantity(current.cart.id, parsed.data.itemId, parsed.data.quantity);
    const updated = commerce.findCartById(current.cart.id) ?? current.cart;
    return NextResponse.json(serialize(commerce.cartLines(updated), commerce.getSettings().cardEnabled));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar." }, { status: 409 });
  } finally {
    db.close();
  }
}

export async function DELETE(request: Request) {
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Item não informado." }, { status: 422 });
  const current = await readCart();
  if (!current) return NextResponse.json({ items: [], subtotalCents: 0, paymentMethods: ["PIX"] });
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    commerce.removeCartItem(current.cart.id, itemId);
    const updated = commerce.findCartById(current.cart.id) ?? { ...current.cart, items: [] };
    return NextResponse.json(serialize(commerce.cartLines(updated), commerce.getSettings().cardEnabled));
  } finally {
    db.close();
  }
}
