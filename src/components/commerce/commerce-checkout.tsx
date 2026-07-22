"use client";

import { CheckCircle, CreditCard, MapPin, PixLogo, Truck } from "@phosphor-icons/react";
import Link from "next/link";
import Script from "next/script";
import { FormEvent, useRef, useState } from "react";
import { PixPaymentPanel } from "@/components/checkout/pix-payment-panel";

type Quote = {
  id: string;
  serviceCode: string;
  label: string;
  amountMinor: number;
  estimatedBusinessDays: number;
  expiresAt: string;
};

type CheckoutResult = {
  status: "paid" | "payment_pending";
  orderCode: string;
  payment: {
    externalId: string;
    status: "PENDING" | "PAID" | "FAILED";
    provider: string;
    expiresAt: string | null;
    pix: { copyPasteCode: string; qrCodeBase64: string | null } | null;
  };
};

type MercadoPagoClient = {
  createCardToken(input: Record<string, string>): Promise<{
    id?: string;
    error?: { message?: string };
  }>;
  getPaymentMethods(input: { bin: string }): Promise<{
    results?: Array<{ id?: string }>;
  }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => MercadoPagoClient;
  }
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inputClass = "min-h-12 rounded-control border border-border px-4 font-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function CommerceCheckout({
  customer,
  subtotalCents,
  paymentMethods,
  maxInstallments,
  mercadoPagoPublicKey,
  allowMockCard,
  shippingEnabled,
}: {
  customer: { name: string; email: string };
  subtotalCents: number;
  paymentMethods: Array<"PIX" | "CREDIT_CARD">;
  maxInstallments: number;
  mercadoPagoPublicKey: string | null;
  allowMockCard: boolean;
  shippingEnabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">(paymentMethods[0]);
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "SHIPPING">("PICKUP");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "quoting" | "submitting" | "error" | "complete">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const selectedQuote = quotes.find((quote) => quote.id === quoteId);
  const totalCents = subtotalCents + (fulfillment === "SHIPPING" ? selectedQuote?.amountMinor ?? 0 : 0);

  async function quoteShipping() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setState("quoting");
    setMessage("");
    const response = await fetch("/api/shipping/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postalCode: data.get("postalCode") }),
    });
    const payload = (await response.json()) as { quotes?: Quote[]; error?: string };
    if (!response.ok) {
      setState("error");
      setMessage(payload.error ?? "Não foi possível calcular o frete.");
      return;
    }
    setQuotes(payload.quotes ?? []);
    setQuoteId(payload.quotes?.[0]?.id ?? null);
    setState("idle");
  }

  async function tokenizeCard(data: FormData) {
    if (method !== "CREDIT_CARD") return {};
    if (allowMockCard && !mercadoPagoPublicKey) {
      return { cardToken: "mock_card_token_leal", cardPaymentMethodId: "visa" };
    }
    if (!mercadoPagoPublicKey || !window.MercadoPago) {
      throw new Error("A tokenização do cartão ainda não está disponível.");
    }

    const cardNumber = String(data.get("cardNumber") ?? "").replace(/\D/g, "");
    if (cardNumber.length < 6) throw new Error("Informe um número de cartão válido.");
    const mercadoPago = new window.MercadoPago(mercadoPagoPublicKey);
    const methods = await mercadoPago.getPaymentMethods({ bin: cardNumber.slice(0, 6) });
    const cardPaymentMethodId = methods.results?.[0]?.id;
    if (!cardPaymentMethodId) throw new Error("A bandeira do cartão não foi reconhecida.");

    const token = await mercadoPago.createCardToken({
      cardNumber,
      cardholderName: String(data.get("cardholderName") ?? ""),
      cardExpirationMonth: String(data.get("cardExpirationMonth") ?? ""),
      cardExpirationYear: String(data.get("cardExpirationYear") ?? ""),
      securityCode: String(data.get("securityCode") ?? ""),
      identificationType: "CPF",
      identificationNumber: String(data.get("cardDocument") ?? "").replace(/\D/g, ""),
    });
    if (!token.id) throw new Error(token.error?.message ?? "O cartão não pôde ser validado.");
    return { cardToken: token.id, cardPaymentMethodId };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("submitting");
    setMessage("");
    try {
      const card = await tokenizeCard(data);
      const address = fulfillment === "SHIPPING" ? {
        postalCode: String(data.get("postalCode")),
        street: String(data.get("street")),
        number: String(data.get("number")),
        complement: String(data.get("complement")),
        neighborhood: String(data.get("neighborhood")),
        city: String(data.get("city")),
        state: String(data.get("state")),
      } : null;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current ??= crypto.randomUUID(),
        },
        body: JSON.stringify({
          contact: { name: data.get("name"), phone: data.get("phone"), document: data.get("document") },
          paymentMethod: method,
          installments: Number(data.get("installments") ?? 1),
          ...card,
          fulfillment: { method: fulfillment, address, shippingQuoteId: fulfillment === "SHIPPING" ? quoteId : null },
          fiscal: {
            requested: data.get("fiscalRequested") === "true",
            partyType: data.get("partyType") || null,
            document: data.get("fiscalDocument") || null,
            legalName: data.get("legalName") || null,
          },
          acceptedTerms: data.get("acceptedTerms") === "true",
        }),
      });
      const payload = (await response.json()) as CheckoutResult & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Não foi possível finalizar o pedido.");
      window.dispatchEvent(new CustomEvent("lealbrinde:cart-updated", { detail: { count: 0 } }));
      setResult(payload);
      setState("complete");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível finalizar.");
    }
  }

  if (state === "complete" && result) {
    return (
      <div className="mx-auto max-w-3xl">
        {result.payment.pix ? (
          <PixPaymentPanel
            orderCode={result.orderCode}
            payment={{
              externalId: result.payment.externalId,
              externalReference: result.orderCode,
              amountMinor: totalCents,
              status: result.payment.status === "PAID"
                ? "PAID"
                : result.payment.status === "FAILED"
                  ? "FAILED"
                  : "PENDING_PIX",
              copyPasteCode: result.payment.pix.copyPasteCode,
              qrCodeBase64: result.payment.pix.qrCodeBase64,
              expiresAt: result.payment.expiresAt ?? new Date().toISOString(),
              provider: result.payment.provider,
              sandbox: result.payment.provider === "mock",
            }}
          />
        ) : (
          <div className="rounded-card border border-emerald-200 bg-emerald-50 p-7">
            <CheckCircle aria-hidden size={42} weight="fill" className="text-success" />
            <h1 className="mt-5 text-3xl font-black">Pedido {result.orderCode} criado</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-900">Pagamento confirmado. O pedido já aparece na sua conta.</p>
          </div>
        )}
        <Link href={`/minha-conta/pedidos/${result.orderCode}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-bold text-white">
          Acompanhar pedido
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" />
      <form ref={formRef} onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="overflow-hidden rounded-card border border-border bg-white shadow-premium [&>section]:border-b [&>section]:border-border [&>section]:p-6 [&>section:last-child]:border-b-0 sm:[&>section]:p-8">
          <section>
            <h2 className="text-xl font-black">Contato e identificação</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Nome<input name="name" required defaultValue={customer.name} className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-bold">E-mail<input disabled value={customer.email} className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
              <label className="grid gap-2 text-sm font-bold">Telefone<input name="phone" required autoComplete="tel" className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-bold">CPF ou CNPJ<input name="document" required inputMode="numeric" autoComplete="off" className={inputClass} /><span className="text-xs font-normal text-muted">Usado apenas para processar e identificar o pagamento.</span></label>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black">Recebimento</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setFulfillment("PICKUP")} aria-pressed={fulfillment === "PICKUP"} className={`min-h-14 rounded-control border p-3 text-left font-bold ${fulfillment === "PICKUP" ? "border-accent bg-accent-soft text-accent-strong" : "border-border"}`}><MapPin aria-hidden size={20} className="mb-2" />Retirada local gratuita</button>
              <button type="button" disabled={!shippingEnabled} onClick={() => setFulfillment("SHIPPING")} aria-pressed={fulfillment === "SHIPPING"} className={`min-h-14 rounded-control border p-3 text-left font-bold disabled:opacity-40 ${fulfillment === "SHIPPING" ? "border-accent bg-accent-soft text-accent-strong" : "border-border"}`}><Truck aria-hidden size={20} className="mb-2" />Entrega nacional</button>
            </div>
            {fulfillment === "SHIPPING" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">CEP<input name="postalCode" required className={inputClass} /></label>
                <div className="self-end"><button type="button" onClick={quoteShipping} className="min-h-12 rounded-full border border-accent px-5 font-bold text-accent">{state === "quoting" ? "Calculando" : "Calcular frete"}</button></div>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Rua<input name="street" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Número<input name="number" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Complemento<input name="complement" className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Bairro<input name="neighborhood" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Cidade<input name="city" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Estado<input name="state" required maxLength={2} className={`${inputClass} uppercase`} /></label>
                {quotes.length ? (
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm font-bold">Escolha o frete</legend>
                    <div className="mt-3 grid gap-2">{quotes.map((quote) => (
                      <label key={quote.id} className="flex items-center justify-between gap-4 rounded-control border p-4">
                        <span className="flex items-center gap-3"><input type="radio" name="shippingQuote" value={quote.id} checked={quoteId === quote.id} onChange={() => setQuoteId(quote.id)} /><span><strong className="block">{quote.label}</strong><small>{quote.estimatedBusinessDays} dias úteis</small></span></span>
                        <strong>{money.format(quote.amountMinor / 100)}</strong>
                      </label>
                    ))}</div>
                  </fieldset>
                ) : null}
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-xl font-black">Pagamento</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {paymentMethods.includes("PIX") ? <button type="button" onClick={() => setMethod("PIX")} aria-pressed={method === "PIX"} className={`min-h-14 rounded-control border p-3 text-left font-bold ${method === "PIX" ? "border-accent bg-accent-soft text-accent-strong" : "border-border"}`}><PixLogo aria-hidden size={21} className="mb-2" />Pix</button> : null}
              {paymentMethods.includes("CREDIT_CARD") ? <button type="button" onClick={() => setMethod("CREDIT_CARD")} aria-pressed={method === "CREDIT_CARD"} className={`min-h-14 rounded-control border p-3 text-left font-bold ${method === "CREDIT_CARD" ? "border-accent bg-accent-soft text-accent-strong" : "border-border"}`}><CreditCard aria-hidden size={21} className="mb-2" />Cartão</button> : null}
            </div>
            {method === "CREDIT_CARD" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Número do cartão<input name="cardNumber" inputMode="numeric" autoComplete="cc-number" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nome no cartão<input name="cardholderName" autoComplete="cc-name" required className={`${inputClass} uppercase`} /></label>
                <label className="grid gap-2 text-sm font-bold">Mês<input name="cardExpirationMonth" inputMode="numeric" maxLength={2} required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Ano<input name="cardExpirationYear" inputMode="numeric" maxLength={4} required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">CVV<input name="securityCode" inputMode="numeric" autoComplete="cc-csc" maxLength={4} required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold">CPF do titular<input name="cardDocument" inputMode="numeric" required className={inputClass} /></label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Parcelas<select name="installments" className={`${inputClass} bg-white`}>{Array.from({ length: maxInstallments }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count}x de {money.format(totalCents / count / 100)}</option>)}</select></label>
              </div>
            ) : <input type="hidden" name="installments" value="1" />}
          </section>

          <section>
            <label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" name="fiscalRequested" value="true" className="mt-1 size-4 accent-accent" />Preciso de nota fiscal com dados específicos</label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Pessoa<select name="partyType" className={`${inputClass} bg-white`}><option value="">Selecione se necessário</option><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
              <label className="grid gap-2 text-sm font-bold">CPF ou CNPJ<input name="fiscalDocument" className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nome ou razão social<input name="legalName" className={inputClass} /></label>
            </div>
          </section>
        </div>

        <aside className="rounded-card border border-accent/20 bg-[linear-gradient(145deg,var(--surface),var(--accent-soft))] p-6 shadow-premium lg:sticky lg:top-28">
          <h2 className="text-xl font-black">Resumo</h2>
          <div className="mt-5 flex justify-between text-sm"><span className="text-muted">Produtos</span><strong>{money.format(subtotalCents / 100)}</strong></div>
          <div className="mt-3 flex justify-between text-sm"><span className="text-muted">Frete</span><strong>{fulfillment === "PICKUP" ? "Grátis" : selectedQuote ? money.format(selectedQuote.amountMinor / 100) : "Calcule"}</strong></div>
          <div className="mt-5 flex justify-between border-t pt-5"><span className="font-bold">Total</span><strong className="text-xl tabular-nums">{money.format(totalCents / 100)}</strong></div>
          <label className="mt-6 flex items-start gap-3 text-xs leading-5 text-muted"><input required type="checkbox" name="acceptedTerms" value="true" className="mt-1 size-4 accent-accent" />Li e aceito os termos da compra e da personalização.</label>
          <button disabled={state === "submitting" || (fulfillment === "SHIPPING" && !quoteId)} className="mt-6 min-h-12 w-full rounded-full bg-accent px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{state === "submitting" ? "Criando pedido" : method === "PIX" ? "Gerar Pix" : "Pagar com cartão"}</button>
          {message ? <p role="alert" className="mt-4 text-sm font-bold text-danger">{message}</p> : null}
        </aside>
      </form>
    </>
  );
}
