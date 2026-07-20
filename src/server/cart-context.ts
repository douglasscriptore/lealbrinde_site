import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import type { Cart, CartLine } from "@/domain";
import { CommerceRepository, openDatabase } from "@/server/db";

const CART_COOKIE = "leal_cart";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function readCart(): Promise<{ cart: Cart; lines: CartLine[] } | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    const cart = commerce.findCartByTokenHash(hashToken(token));
    if (!cart || cart.status !== "ACTIVE") return null;
    return { cart, lines: commerce.cartLines(cart) };
  } finally {
    db.close();
  }
}

export async function ensureCartCookie(): Promise<{ tokenHash: string; created: boolean }> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return { tokenHash: hashToken(existing), created: false };
  const token = randomBytes(32).toString("base64url");
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return { tokenHash: hashToken(token), created: true };
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
