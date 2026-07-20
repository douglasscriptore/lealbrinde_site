"use client";

import { CheckCircle, Minus, Plus, ShoppingCartSimple } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { PersonalizationField, ProductOption, ProductVariant } from "@/domain";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductConfigurator({
  productId,
  options,
  variants,
  fields,
}: {
  productId: string;
  options: ProductOption[];
  variants: ProductVariant[];
  fields: PersonalizationField[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const initial = variants.find((variant) => variant.active) ?? variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(initial?.optionValues ?? {});
  const [quantity, setQuantity] = useState(initial?.minimumQuantity ?? 1);
  const [customization, setCustomization] = useState<Record<string, string | number>>({});
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [message, setMessage] = useState("");

  const variant = useMemo(
    () => variants.find((candidate) => options.every((option) => candidate.optionValues[option.name] === selection[option.name])),
    [options, selection, variants],
  );
  const personalization = fields.reduce((total, field) => customization[field.key] ? total + field.priceAdjustmentCents : total, 0);
  const total = variant ? variant.basePriceCents * quantity + personalization : 0;

  function selectOption(name: string, value: string) {
    const next = { ...selection, [name]: value };
    setSelection(next);
    const nextVariant = variants.find((candidate) => options.every((option) => candidate.optionValues[option.name] === next[option.name]));
    if (nextVariant) setQuantity(nextVariant.minimumQuantity);
    setState("idle");
  }

  async function addToCart() {
    if (!variant) return;
    setState("adding");
    setMessage("");
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, variantId: variant.id, quantity, customization }),
    });
    const payload = await response.json() as {
      error?: string;
      items?: Array<{ quantity: number }>;
    };
    if (!response.ok) {
      setState("error");
      setMessage(payload.error ?? "Não foi possível adicionar ao carrinho.");
      return;
    }
    setState("added");
    setMessage("Produto adicionado ao carrinho.");
    window.dispatchEvent(new CustomEvent("lealbrinde:cart-updated", {
      detail: {
        count: (payload.items ?? []).reduce((total, item) => total + item.quantity, 0),
      },
    }));
    router.refresh();
  }

  return (
    <div className="rounded-card border border-accent/20 bg-surface p-5 shadow-premium sm:p-7">
      {options.map((option) => (
        <fieldset key={option.id} className="mb-6">
          <legend className="text-sm font-bold text-foreground">{option.name}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selection[option.name] === value.value;
              return <button type="button" key={value.id} onClick={() => selectOption(option.name, value.value)} aria-pressed={selected} className={`min-h-11 rounded-control border px-4 text-sm font-semibold transition-[transform,color,background-color,border-color] active:scale-[0.98] ${selected ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-background text-foreground hover:border-accent"}`}>{value.value}</button>;
            })}
          </div>
        </fieldset>
      ))}

      {fields.length ? (
        <div className="mb-6 grid gap-4 border-t border-border pt-6">
          {fields.map((field) => (
            <label key={field.id} className="grid gap-2 text-sm font-bold">
              {field.label}{field.required ? " *" : ""}
              {field.type === "SELECT" ? (
                <select required={field.required} value={String(customization[field.key] ?? "")} onChange={(event) => setCustomization((current) => ({ ...current, [field.key]: event.target.value }))} className="min-h-12 rounded-control border border-border bg-background px-4 font-normal">
                  <option value="">Selecione</option>
                  {field.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : (
                <input required={field.required} maxLength={field.maximumLength ?? undefined} type={field.type === "NUMBER" ? "number" : field.type === "COLOR" ? "color" : "text"} value={String(customization[field.key] ?? "")} onChange={(event) => setCustomization((current) => ({ ...current, [field.key]: event.target.value }))} className="min-h-12 rounded-control border border-border bg-background px-4 font-normal" />
              )}
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-4 rounded-control bg-surface-strong p-4">
        <div>
          <p className="text-sm text-muted">Quantidade</p>
          <div className="mt-2 inline-flex items-center rounded-control border border-border bg-white p-1 shadow-[inset_0_1px_2px_rgb(30_75_91/0.05)]">
            <button type="button" aria-label="Diminuir quantidade" disabled={!variant || quantity <= variant.minimumQuantity} onClick={() => variant && setQuantity((current) => Math.max(variant.minimumQuantity, current - variant.quantityIncrement))} className="grid size-10 place-items-center rounded-lg text-accent disabled:opacity-30"><Minus aria-hidden size={18} /></button>
            <span className="min-w-12 text-center font-black tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" aria-label="Aumentar quantidade" disabled={!variant} onClick={() => variant && setQuantity((current) => current + variant.quantityIncrement)} className="grid size-10 place-items-center rounded-lg text-accent disabled:opacity-30"><Plus aria-hidden size={18} /></button>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">Total</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={total} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} className="mt-1 text-2xl font-black tabular-nums text-foreground">{variant ? money.format(total / 100) : "Indisponível"}</motion.p>
          </AnimatePresence>
        </div>
      </div>

      <button type="button" onClick={addToCart} disabled={!variant || state === "adding"} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50">
        {state === "added" ? <CheckCircle aria-hidden size={21} weight="fill" /> : <ShoppingCartSimple aria-hidden size={21} weight="bold" />}
        {state === "adding" ? "Adicionando" : state === "added" ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
      </button>
      {message ? <p role="status" className={`mt-3 text-sm font-semibold ${state === "error" ? "text-danger" : "text-success"}`}>{message}</p> : null}
    </div>
  );
}
