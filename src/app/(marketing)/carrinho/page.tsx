import type { Metadata } from "next";
import { CartView } from "@/components/commerce";
import { allowedPaymentMethods } from "@/domain";
import { readCart } from "@/server/cart-context";
import { CommerceRepository, openDatabase } from "@/server/db";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const current = await readCart();
  const db = openDatabase();
  try {
    const cardEnabled = new CommerceRepository(db).getSettings().cardEnabled;
    const lines = current?.lines ?? [];
    return (
      <main id="conteudo" className="bg-surface-subtle py-10 sm:py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Sua seleção</p><h1 className="mt-3 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Carrinho</h1><p className="mt-4 text-base leading-7 text-muted">Revise produtos e quantidades. Frete e pagamento são confirmados na próxima etapa.</p></header>
        <CartView initial={{ items: lines.map((line) => ({ id: line.id, productName: line.product.name, productSlug: line.product.slug, imageUrl: line.product.mainImageUrl, sku: line.variant?.sku ?? null, options: line.variant?.optionValues ?? {}, quantity: line.quantity, unit: line.unit, unitPriceCents: line.unitPriceCents, totalCents: line.totalCents })), subtotalCents: lines.reduce((sum, line) => sum + line.totalCents, 0), paymentMethods: allowedPaymentMethods(lines.map((line) => line.product.type), cardEnabled) }} />
        </div>
      </main>
    );
  } finally { db.close(); }
}
