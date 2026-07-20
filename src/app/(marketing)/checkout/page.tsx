import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommerceCheckout } from "@/components/commerce";
import { allowedPaymentMethods } from "@/domain";
import { requireSession } from "@/server/auth/session";
import { readCart } from "@/server/cart-context";
import { CommerceRepository, openDatabase } from "@/server/db";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await requireSession("/checkout");
  let current = await readCart();
  if (!current?.lines.length) redirect("/carrinho");
  const db = openDatabase();
  try {
    const commerce = new CommerceRepository(db);
    const claimed = commerce.claimCart(current.cart.id, { id: session.user.id, email: session.user.email });
    current = { cart: claimed, lines: commerce.cartLines(claimed) };
    const settings = commerce.getSettings();
    return <main id="conteudo" className="bg-surface-subtle py-10 sm:py-16"><div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8"><header className="mb-10 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Compra segura</p><h1 className="mt-3 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Finalizar pedido</h1><p className="mt-4 text-base leading-7 text-muted">Preços e disponibilidade serão recalculados antes do pagamento.</p></header><CommerceCheckout customer={{ name: session.user.name, email: session.user.email }} subtotalCents={current.lines.reduce((sum, line) => sum + line.totalCents, 0)} paymentMethods={allowedPaymentMethods(current.lines.map((line) => line.product.type), settings.cardEnabled)} maxInstallments={settings.maxInstallments} mercadoPagoPublicKey={process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? null} allowMockCard={process.env.NODE_ENV !== "production"} shippingEnabled={settings.shippingEnabled} /></div></main>;
  } finally { db.close(); }
}
