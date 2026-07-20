"use client";

import { Minus, Plus, ShoppingCartSimple, Trash } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

type CartPayload = {
  items: Array<{
    id: string; productName: string; productSlug: string; imageUrl: string | null;
    sku: string | null; options: Record<string, string>; quantity: number; unit: "UNIT" | "METER";
    unitPriceCents: number; totalCents: number;
  }>;
  subtotalCents: number;
  paymentMethods: Array<"PIX" | "CREDIT_CARD">;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function CartView({ initial }: { initial: CartPayload }) {
  const reduce = useReducedMotion();
  const [cart, setCart] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function mutate(url: string, init: RequestInit, itemId: string) {
    setBusy(itemId); setError("");
    const response = await fetch(url, init);
    const payload = await response.json() as CartPayload & { error?: string };
    setBusy(null);
    if (!response.ok) { setError(payload.error ?? "Não foi possível atualizar o carrinho."); return; }
    setCart(payload);
    window.dispatchEvent(new CustomEvent("lealbrinde:cart-updated", {
      detail: {
        count: payload.items.reduce((total, item) => total + item.quantity, 0),
      },
    }));
  }

  if (!cart.items.length) return (
    <div className="grid min-h-96 place-items-center rounded-card border border-dashed border-border bg-surface-strong p-8 text-center">
      <div className="max-w-md">
        <ShoppingCartSimple aria-hidden size={50} weight="duotone" className="mx-auto text-accent" />
        <h1 className="mt-5 text-3xl font-black tracking-tight">Seu carrinho está vazio</h1>
        <p className="mt-3 text-muted">Escolha um produto e configure as opções antes de continuar.</p>
        <Link href="/produtos" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-bold text-accent-foreground">Explorar o catálogo</Link>
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-premium">
        {cart.items.map((item) => (
          <article key={item.id} className="grid gap-5 border-b border-border p-4 last:border-b-0 sm:grid-cols-[8.5rem_1fr_auto] sm:items-center sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface-strong">
              {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="112px" className="object-cover" /> : null}
            </div>
            <div>
              <Link href={item.productSlug} className="text-lg font-black text-foreground hover:text-accent">{item.productName}</Link>
              {Object.keys(item.options).length ? <p className="mt-1 text-sm text-muted">{Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(", ")}</p> : null}
              {item.sku ? <p className="mt-1 font-mono text-xs text-muted">{item.sku}</p> : null}
              <p className="mt-3 text-sm font-bold text-foreground">{money.format(item.unitPriceCents / 100)} por {item.unit === "METER" ? "metro" : "unidade"}</p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
              <div className="inline-flex items-center rounded-control border border-border p-1">
                <button disabled={busy === item.id || item.quantity <= 1} aria-label="Diminuir" onClick={() => mutate("/api/cart", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: item.id, quantity: item.quantity - 1 }) }, item.id)} className="grid size-9 place-items-center disabled:opacity-30"><Minus aria-hidden size={16} /></button>
                <span className="min-w-10 text-center font-bold tabular-nums">{item.quantity}</span>
                <button disabled={busy === item.id} aria-label="Aumentar" onClick={() => mutate("/api/cart", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: item.id, quantity: item.quantity + 1 }) }, item.id)} className="grid size-9 place-items-center disabled:opacity-30"><Plus aria-hidden size={16} /></button>
              </div>
              <AnimatePresence mode="popLayout" initial={false}><motion.p key={item.totalCents} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} className="font-black tabular-nums">{money.format(item.totalCents / 100)}</motion.p></AnimatePresence>
              <button disabled={busy === item.id} onClick={() => mutate(`/api/cart?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }, item.id)} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-danger"><Trash aria-hidden size={17} />Remover</button>
            </div>
          </article>
        ))}
        {error ? <p role="alert" className="m-4 rounded-control border border-red-200 bg-red-50 p-4 text-sm font-bold text-danger">{error}</p> : null}
      </div>
      <aside className="rounded-card border border-accent/20 bg-[linear-gradient(145deg,var(--surface),var(--accent-soft))] p-6 shadow-premium lg:sticky lg:top-28">
        <h2 className="text-xl font-black">Resumo</h2>
        <div className="mt-5 flex justify-between border-b border-accent/15 pb-5 text-sm"><span className="text-muted">Subtotal</span><AnimatePresence mode="popLayout" initial={false}><motion.strong key={cart.subtotalCents} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="tabular-nums">{money.format(cart.subtotalCents / 100)}</motion.strong></AnimatePresence></div>
        <p className="mt-5 text-sm leading-6 text-muted">Frete ou retirada serão confirmados no checkout.</p>
        <p className="mt-3 text-sm font-semibold text-foreground">Pagamento: {cart.paymentMethods.includes("CREDIT_CARD") ? "Pix ou cartão" : "somente Pix"}</p>
        <Link href="/checkout" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground">Ir para o checkout</Link>
        <Link href="/produtos" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 font-bold text-foreground">Continuar comprando</Link>
      </aside>
    </div>
  );
}
