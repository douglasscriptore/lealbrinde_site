"use client";

import {
  CheckCircle,
  FileArrowUp,
  Info,
  Minus,
  Package,
  Plus,
  Storefront,
  Truck,
  Warning,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { ArtworkUpload } from "./artwork-upload";
import type {
  CheckoutAddress,
  CheckoutApiError,
  CheckoutFulfillmentMethod,
  CreateDtfOrderRequest,
  CreateDtfOrderResponse,
  DtfCheckoutPriceTable,
  DtfCheckoutProduct,
  FiscalPersonType,
  UploadedArtworkAsset,
} from "./contracts";
import { CheckoutField, CheckoutSection } from "./form-controls";
import { PixPaymentPanel } from "./pix-payment-panel";

type DtfOrderFormProps = {
  product: DtfCheckoutProduct;
  priceTable: DtfCheckoutPriceTable;
  initialMeters?: number;
  ordersEndpoint?: string;
  uploadsEndpoint?: string;
  termsHref?: string;
  privacyHref?: string;
};

type FormErrors = Partial<
  Record<
    | "quantity"
    | "artwork"
    | "contactName"
    | "contactEmail"
    | "contactPhone"
    | "postalCode"
    | "street"
    | "number"
    | "neighborhood"
    | "city"
    | "state"
    | "fiscalName"
    | "fiscalDocument"
    | "fiscalEmail"
    | "fiscalPhone"
    | "terms"
    | "form",
    string
  >
>;

type ContactState = {
  name: string;
  email: string;
  phone: string;
};

type FiscalState = {
  issueInvoice: boolean;
  personType: FiscalPersonType;
  copyContactData: boolean;
  legalName: string;
  document: string;
  stateRegistration: string;
  email: string;
  phone: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "verification_required"; orderCode: string; message?: string }
  | {
      status: "payment_created";
      orderCode: string;
      payment: Extract<CreateDtfOrderResponse, { status: "payment_created" }>['payment'];
    };

const emptyAddress: CheckoutAddress = {
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatMoney(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function findQuote(priceTable: DtfCheckoutPriceTable, quantityMeters: number) {
  const tier = priceTable.tiers.find(
    (candidate) =>
      quantityMeters >= candidate.minimumMeters &&
      (candidate.maximumExclusiveMeters === null ||
        quantityMeters < candidate.maximumExclusiveMeters),
  );

  if (!tier) return null;
  return {
    tier,
    subtotalCents: quantityMeters * tier.unitPriceCents,
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function documentLength(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").length;
}

function isApiError(value: unknown): value is CheckoutApiError {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as { error?: unknown }).error === "string",
  );
}

function isOrderResponse(value: unknown): value is CreateDtfOrderResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { status?: unknown; orderCode?: unknown; payment?: unknown };
  if (typeof candidate.orderCode !== "string") return false;
  if (candidate.status === "verification_required") return true;
  return candidate.status === "payment_created" && Boolean(candidate.payment);
}

export function DtfOrderForm({
  product,
  priceTable,
  initialMeters = product.minimumMeters,
  ordersEndpoint = "/api/orders",
  uploadsEndpoint = "/api/uploads",
  termsHref = "/termos-de-uso",
  privacyHref = "/politica-de-privacidade",
}: DtfOrderFormProps) {
  const initialFulfillment = product.fulfillmentOptions.includes("PICKUP")
    ? "PICKUP"
    : (product.fulfillmentOptions[0] ?? "PICKUP");
  const [quantityInput, setQuantityInput] = useState(String(initialMeters));
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<CheckoutFulfillmentMethod>(initialFulfillment);
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddress>(emptyAddress);
  const [contact, setContact] = useState<ContactState>({ name: "", email: "", phone: "" });
  const [fiscal, setFiscal] = useState<FiscalState>({
    issueInvoice: true,
    personType: "PF",
    copyContactData: true,
    legalName: "",
    document: "",
    stateRegistration: "",
    email: "",
    phone: "",
  });
  const [artworkAsset, setArtworkAsset] = useState<UploadedArtworkAsset | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const quantityMeters = Number(quantityInput);
  const quantityIsValid =
    Number.isInteger(quantityMeters) &&
    quantityMeters >= product.minimumMeters &&
    (quantityMeters - product.minimumMeters) % product.meterIncrement === 0;
  const quote = useMemo(
    () => (quantityIsValid ? findQuote(priceTable, quantityMeters) : null),
    [priceTable, quantityIsValid, quantityMeters],
  );

  function changeQuantity(amount: number) {
    const current = Number.isInteger(quantityMeters) ? quantityMeters : product.minimumMeters;
    setQuantityInput(String(Math.max(product.minimumMeters, current + amount)));
    setErrors((currentErrors) => ({ ...currentErrors, quantity: undefined }));
  }

  function setAddressField(field: keyof CheckoutAddress, value: string) {
    setShippingAddress((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: FormErrors = {};

    if (!quantityIsValid || !quote) {
      nextErrors.quantity = `Informe uma quantidade inteira a partir de ${product.minimumMeters} m.`;
    }
    if (!artworkAsset) nextErrors.artwork = "Envie um arquivo válido antes de continuar.";
    if (contact.name.trim().length < 3) nextErrors.contactName = "Informe seu nome ou empresa.";
    if (!isEmail(contact.email.trim())) nextErrors.contactEmail = "Informe um e-mail válido.";
    if (contact.phone.replace(/\D/g, "").length < 8) {
      nextErrors.contactPhone = "Informe um telefone válido.";
    }

    if (fulfillmentMethod === "SHIPPING") {
      if (shippingAddress.postalCode.replace(/\D/g, "").length !== 8) {
        nextErrors.postalCode = "Informe um CEP com 8 dígitos.";
      }
      if (!shippingAddress.street.trim()) nextErrors.street = "Informe a rua ou avenida.";
      if (!shippingAddress.number.trim()) nextErrors.number = "Informe o número.";
      if (!shippingAddress.neighborhood.trim()) nextErrors.neighborhood = "Informe o bairro.";
      if (!shippingAddress.city.trim()) nextErrors.city = "Informe a cidade.";
      if (shippingAddress.state.trim().length !== 2) nextErrors.state = "Use a sigla do estado.";
    }

    if (fiscal.issueInvoice) {
      const fiscalName = fiscal.copyContactData ? contact.name : fiscal.legalName;
      const fiscalEmail = fiscal.copyContactData ? contact.email : fiscal.email;
      const fiscalPhone = fiscal.copyContactData ? contact.phone : fiscal.phone;
      if (fiscalName.trim().length < 3) nextErrors.fiscalName = "Informe o nome fiscal.";
      if (documentLength(fiscal.document) !== (fiscal.personType === "PF" ? 11 : 14)) {
        nextErrors.fiscalDocument =
          fiscal.personType === "PF"
            ? "Informe um CPF com 11 caracteres."
            : "Informe um CNPJ com 14 caracteres, incluindo letras quando aplicável.";
      }
      if (!isEmail(fiscalEmail.trim())) nextErrors.fiscalEmail = "Informe um e-mail fiscal válido.";
      if (fiscalPhone.replace(/\D/g, "").length < 8) {
        nextErrors.fiscalPhone = "Informe um telefone fiscal válido.";
      }
    }

    if (!acceptedTerms) nextErrors.terms = "Aceite os termos para criar o pedido.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return false;
    }
    return true;
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || !quote || !artworkAsset) return;

    setSubmitState({ status: "submitting" });
    setErrors({});

    const fiscalName = fiscal.copyContactData ? contact.name : fiscal.legalName;
    const fiscalEmail = fiscal.copyContactData ? contact.email : fiscal.email;
    const fiscalPhone = fiscal.copyContactData ? contact.phone : fiscal.phone;
    const request: CreateDtfOrderRequest = {
      productId: product.id,
      priceTableId: priceTable.id,
      quantityMeters,
      artworkAssetId: artworkAsset.assetId,
      fulfillment: {
        method: fulfillmentMethod,
        address: fulfillmentMethod === "SHIPPING" ? shippingAddress : null,
      },
      contact: {
        name: contact.name.trim(),
        email: contact.email.trim().toLowerCase(),
        phone: contact.phone.trim(),
      },
      fiscal: {
        issueInvoice: fiscal.issueInvoice,
        personType: fiscal.issueInvoice ? fiscal.personType : null,
        copyContactData: fiscal.copyContactData,
        legalName: fiscal.issueInvoice ? fiscalName.trim() : null,
        document: fiscal.issueInvoice ? fiscal.document.trim().toUpperCase() : null,
        stateRegistration:
          fiscal.issueInvoice && fiscal.personType === "PJ"
            ? fiscal.stateRegistration.trim() || null
            : null,
        email: fiscal.issueInvoice ? fiscalEmail.trim().toLowerCase() : null,
        phone: fiscal.issueInvoice ? fiscalPhone.trim() : null,
      },
      acceptedTerms,
    };

    try {
      const response = await fetch(ordersEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(isApiError(payload) ? payload.error : "Não foi possível criar o pedido.");
      }
      if (!isOrderResponse(payload)) {
        throw new Error("O servidor retornou uma resposta de pedido inválida.");
      }

      if (payload.status === "verification_required") {
        setSubmitState({
          status: payload.status,
          orderCode: payload.orderCode,
          message: payload.message,
        });
      } else {
        setSubmitState({
          status: payload.status,
          orderCode: payload.orderCode,
          payment: payload.payment,
        });
      }
    } catch (error) {
      setSubmitState({ status: "idle" });
      setErrors({
        form: error instanceof Error ? error.message : "Não foi possível criar o pedido.",
      });
      window.requestAnimationFrame(() => document.getElementById("checkout-error")?.focus());
    }
  }

  if (submitState.status === "verification_required") {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-10">
        <CheckCircle aria-hidden="true" size={48} weight="duotone" className="mx-auto text-[var(--accent)]" />
        <p className="mt-5 text-sm font-bold text-[var(--accent)]">Pedido {submitState.orderCode}</p>
        <h1 className="mt-2 text-balance text-3xl font-black tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl">
          Verifique seu e-mail antes do Pix
        </h1>
        <p className="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-[var(--muted)]">
          {submitState.message ??
            `Enviamos uma confirmação para ${contact.email}. Abra o link recebido para validar sua conta e gerar o pagamento do pedido.`}
        </p>
        <div className="mx-auto mt-7 max-w-xl rounded-2xl bg-[var(--surface-strong)] p-5 text-left">
          <p className="text-sm font-bold text-[var(--foreground)]">Nenhum Pix foi criado ainda</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Essa etapa protege seus arquivos, documentos fiscais e o acompanhamento do pedido.
          </p>
        </div>
      </section>
    );
  }

  if (submitState.status === "payment_created") {
    return <PixPaymentPanel orderCode={submitState.orderCode} payment={submitState.payment} />;
  }

  return (
    <form noValidate onSubmit={submitOrder} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="grid gap-6">
        {errors.form ? (
          <div
            id="checkout-error"
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] p-5 outline-none"
          >
            <Warning aria-hidden="true" size={23} weight="fill" className="shrink-0 text-[var(--danger)]" />
            <div>
              <p className="font-bold text-[var(--danger)]">Não foi possível criar o pedido</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{errors.form}</p>
            </div>
          </div>
        ) : null}

        <CheckoutSection
          title="Quantidade e recebimento"
          description="Defina a metragem e escolha entre retirada no local ou entrega."
        >
          <label htmlFor="order-meters" className="text-sm font-bold text-[var(--foreground)]">
            Quantidade em metros
          </label>
          <div className="mt-2 flex max-w-sm items-center gap-2">
            <button
              type="button"
              onClick={() => changeQuantity(-product.meterIncrement)}
              disabled={quantityMeters <= product.minimumMeters}
              aria-label={`Diminuir ${product.meterIncrement} metro`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
            >
              <Minus aria-hidden="true" size={18} weight="bold" />
            </button>
            <div className="relative min-w-0 flex-1">
              <input
                id="order-meters"
                type="number"
                inputMode="numeric"
                min={product.minimumMeters}
                step={product.meterIncrement}
                value={quantityInput}
                onChange={(event) => {
                  setQuantityInput(event.target.value);
                  setErrors((current) => ({ ...current, quantity: undefined }));
                }}
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={errors.quantity ? "order-meters-error" : undefined}
                className="h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 pr-16 text-base font-bold tabular-nums text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">m</span>
            </div>
            <button
              type="button"
              onClick={() => changeQuantity(product.meterIncrement)}
              aria-label={`Aumentar ${product.meterIncrement} metro`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
            >
              <Plus aria-hidden="true" size={18} weight="bold" />
            </button>
          </div>
          {errors.quantity ? (
            <p id="order-meters-error" className="mt-2 text-sm font-semibold text-[var(--danger)]">{errors.quantity}</p>
          ) : null}

          <fieldset className="mt-8">
            <legend className="text-sm font-bold text-[var(--foreground)]">Como deseja receber?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.fulfillmentOptions.includes("PICKUP") ? (
                <label className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${fulfillmentMethod === "PICKUP" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)]"}`}>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="PICKUP"
                    checked={fulfillmentMethod === "PICKUP"}
                    onChange={() => setFulfillmentMethod("PICKUP")}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <Storefront aria-hidden="true" size={24} weight="duotone" className="shrink-0 text-[var(--accent)]" />
                  <span>
                    <strong className="block text-sm text-[var(--foreground)]">Retirada no local</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">Avisaremos quando estiver pronto.</span>
                  </span>
                </label>
              ) : null}
              {product.fulfillmentOptions.includes("SHIPPING") ? (
                <label className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${fulfillmentMethod === "SHIPPING" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)]"}`}>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="SHIPPING"
                    checked={fulfillmentMethod === "SHIPPING"}
                    onChange={() => setFulfillmentMethod("SHIPPING")}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <Truck aria-hidden="true" size={24} weight="duotone" className="shrink-0 text-[var(--accent)]" />
                  <span>
                    <strong className="block text-sm text-[var(--foreground)]">Receber por entrega</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">Frete confirmado no servidor antes do Pix.</span>
                  </span>
                </label>
              ) : null}
            </div>
          </fieldset>

          {fulfillmentMethod === "SHIPPING" ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <CheckoutField id="shipping-postal-code" label="CEP" value={shippingAddress.postalCode} onChange={(event) => setAddressField("postalCode", event.target.value)} error={errors.postalCode} autoComplete="postal-code" required />
              </div>
              <div className="sm:col-span-4">
                <CheckoutField id="shipping-street" label="Rua ou avenida" value={shippingAddress.street} onChange={(event) => setAddressField("street", event.target.value)} error={errors.street} autoComplete="address-line1" required />
              </div>
              <div className="sm:col-span-2">
                <CheckoutField id="shipping-number" label="Número" value={shippingAddress.number} onChange={(event) => setAddressField("number", event.target.value)} error={errors.number} required />
              </div>
              <div className="sm:col-span-4">
                <CheckoutField id="shipping-complement" label="Complemento" value={shippingAddress.complement} onChange={(event) => setAddressField("complement", event.target.value)} autoComplete="address-line2" />
              </div>
              <div className="sm:col-span-3">
                <CheckoutField id="shipping-neighborhood" label="Bairro" value={shippingAddress.neighborhood} onChange={(event) => setAddressField("neighborhood", event.target.value)} error={errors.neighborhood} required />
              </div>
              <div className="sm:col-span-2">
                <CheckoutField id="shipping-city" label="Cidade" value={shippingAddress.city} onChange={(event) => setAddressField("city", event.target.value)} error={errors.city} autoComplete="address-level2" required />
              </div>
              <div className="sm:col-span-1">
                <CheckoutField id="shipping-state" label="UF" value={shippingAddress.state} onChange={(event) => setAddressField("state", event.target.value.toUpperCase().slice(0, 2))} error={errors.state} autoComplete="address-level1" maxLength={2} required />
              </div>
            </div>
          ) : null}
        </CheckoutSection>

        <CheckoutSection
          title="Arquivo para impressão"
          description="O envio passa por uma validação mínima agora e por revisão humana depois do Pix."
        >
          <ArtworkUpload
            acceptedExtensions={product.acceptedExtensions}
            maximumFileSizeMb={product.maximumFileSizeMb}
            uploadEndpoint={uploadsEndpoint}
            onAssetChange={(asset) => {
              setArtworkAsset(asset);
              setErrors((current) => ({ ...current, artwork: undefined }));
            }}
          />
          {errors.artwork ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-[var(--danger)]">{errors.artwork}</p>
          ) : null}
          {product.printableWidthCm ? (
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
              <Info aria-hidden="true" size={17} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent)]" />
              Largura útil configurada: {product.printableWidthCm} cm.
            </p>
          ) : null}
        </CheckoutSection>

        <CheckoutSection title="Seus dados" description="Usaremos esses dados para identificar o pedido e enviar atualizações.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CheckoutField id="contact-name" label="Nome ou empresa" value={contact.name} onChange={(event) => { setContact((current) => ({ ...current, name: event.target.value })); setErrors((current) => ({ ...current, contactName: undefined })); }} error={errors.contactName} autoComplete="name" required />
            </div>
            <CheckoutField id="contact-email" type="email" label="E-mail" hint="O e-mail precisa ser verificado antes da geração do Pix." value={contact.email} onChange={(event) => { setContact((current) => ({ ...current, email: event.target.value })); setErrors((current) => ({ ...current, contactEmail: undefined })); }} error={errors.contactEmail} autoComplete="email" required />
            <CheckoutField id="contact-phone" type="tel" label="Telefone" value={contact.phone} onChange={(event) => { setContact((current) => ({ ...current, phone: event.target.value })); setErrors((current) => ({ ...current, contactPhone: undefined })); }} error={errors.contactPhone} autoComplete="tel" required />
          </div>
        </CheckoutSection>

        <CheckoutSection title="Dados fiscais" description="Escolha se deseja nota fiscal e informe os dados de pessoa física ou jurídica.">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--background)] p-4">
            <input type="checkbox" checked={fiscal.issueInvoice} onChange={(event) => setFiscal((current) => ({ ...current, issueInvoice: event.target.checked }))} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              <strong className="block text-sm text-[var(--foreground)]">Quero nota fiscal</strong>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">O documento ficará disponível no acompanhamento do pedido.</span>
            </span>
          </label>

          {fiscal.issueInvoice ? (
            <div className="mt-6">
              <fieldset>
                <legend className="text-sm font-bold text-[var(--foreground)]">Tipo de pessoa</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(["PF", "PJ"] as const).map((personType) => (
                    <label key={personType} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-bold ${fiscal.personType === personType ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface))] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground)]"}`}>
                      <input type="radio" name="person-type" value={personType} checked={fiscal.personType === personType} onChange={() => { setFiscal((current) => ({ ...current, personType, document: "", stateRegistration: "" })); setErrors((current) => ({ ...current, fiscalDocument: undefined })); }} className="accent-[var(--accent)]" />
                      {personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="mt-6 flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={fiscal.copyContactData} onChange={(event) => setFiscal((current) => ({ ...current, copyContactData: event.target.checked }))} className="mt-1 size-4 accent-[var(--accent)]" />
                <span className="text-sm font-semibold text-[var(--foreground)]">Usar nome, e-mail e telefone informados no pedido</span>
              </label>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {!fiscal.copyContactData ? (
                  <>
                    <div className="sm:col-span-2">
                      <CheckoutField id="fiscal-name" label={fiscal.personType === "PF" ? "Nome completo" : "Razão social"} value={fiscal.legalName} onChange={(event) => { setFiscal((current) => ({ ...current, legalName: event.target.value })); setErrors((current) => ({ ...current, fiscalName: undefined })); }} error={errors.fiscalName} required />
                    </div>
                    <CheckoutField id="fiscal-email" type="email" label="E-mail fiscal" value={fiscal.email} onChange={(event) => { setFiscal((current) => ({ ...current, email: event.target.value })); setErrors((current) => ({ ...current, fiscalEmail: undefined })); }} error={errors.fiscalEmail} required />
                    <CheckoutField id="fiscal-phone" type="tel" label="Telefone fiscal" value={fiscal.phone} onChange={(event) => { setFiscal((current) => ({ ...current, phone: event.target.value })); setErrors((current) => ({ ...current, fiscalPhone: undefined })); }} error={errors.fiscalPhone} required />
                  </>
                ) : null}
                <CheckoutField id="fiscal-document" label={fiscal.personType === "PF" ? "CPF" : "CNPJ"} hint={fiscal.personType === "PJ" ? "Aceita o CNPJ alfanumérico quando aplicável." : undefined} value={fiscal.document} onChange={(event) => { setFiscal((current) => ({ ...current, document: event.target.value.toUpperCase() })); setErrors((current) => ({ ...current, fiscalDocument: undefined })); }} error={errors.fiscalDocument} autoCapitalize="characters" required />
                {fiscal.personType === "PJ" ? (
                  <CheckoutField id="fiscal-state-registration" label="Inscrição estadual" hint="Opcional quando não se aplica." value={fiscal.stateRegistration} onChange={(event) => setFiscal((current) => ({ ...current, stateRegistration: event.target.value }))} />
                ) : null}
              </div>
              {fiscal.copyContactData && (errors.fiscalName || errors.fiscalEmail || errors.fiscalPhone) ? (
                <p className="mt-4 text-sm font-semibold text-[var(--danger)]">Corrija os dados de contato usados na nota fiscal.</p>
              ) : null}
            </div>
          ) : null}
        </CheckoutSection>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                setErrors((current) => ({ ...current, terms: undefined }));
              }}
              aria-invalid={Boolean(errors.terms)}
              aria-describedby={errors.terms ? "terms-error" : undefined}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span className="text-sm leading-relaxed text-[var(--muted)]">
              Li e aceito os <a href={termsHref} target="_blank" rel="noreferrer" className="font-bold text-[var(--foreground)] underline decoration-[var(--accent)] underline-offset-4">termos de uso</a> e a <a href={privacyHref} target="_blank" rel="noreferrer" className="font-bold text-[var(--foreground)] underline decoration-[var(--accent)] underline-offset-4">política de privacidade</a>.
            </span>
          </label>
          {errors.terms ? <p id="terms-error" className="mt-3 text-sm font-semibold text-[var(--danger)]">{errors.terms}</p> : null}
        </div>
      </div>

      <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-24 sm:p-6" aria-labelledby="order-summary-title">
        <div className="flex items-start gap-3">
          <Package aria-hidden="true" size={28} weight="duotone" className="shrink-0 text-[var(--accent)]" />
          <div>
            <h2 id="order-summary-title" className="text-xl font-black tracking-[-0.025em] text-[var(--foreground)]">Resumo do pedido</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{product.name}</p>
          </div>
        </div>

        <dl className="mt-7 grid gap-4 text-sm">
          <div className="flex items-start justify-between gap-5">
            <dt className="text-[var(--muted)]">Quantidade</dt>
            <dd className="font-bold tabular-nums text-[var(--foreground)]">{quantityIsValid ? `${quantityMeters} m` : "Inválida"}</dd>
          </div>
          <div className="flex items-start justify-between gap-5">
            <dt className="text-[var(--muted)]">Valor por metro</dt>
            <dd className="font-bold tabular-nums text-[var(--foreground)]">{quote ? formatMoney(quote.tier.unitPriceCents) : "A calcular"}</dd>
          </div>
          <div className="flex items-start justify-between gap-5">
            <dt className="text-[var(--muted)]">Recebimento</dt>
            <dd className="text-right font-bold text-[var(--foreground)]">{fulfillmentMethod === "PICKUP" ? "Retirada" : "Entrega"}</dd>
          </div>
          {fulfillmentMethod === "SHIPPING" ? (
            <div className="flex items-start justify-between gap-5">
              <dt className="text-[var(--muted)]">Frete</dt>
              <dd className="text-right font-bold text-[var(--foreground)]">Confirmado no servidor</dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-5">
            <dt className="text-[var(--muted)]">Arquivo</dt>
            <dd className={`text-right font-bold ${artworkAsset ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
              {artworkAsset ? "Recebido" : "Pendente"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <div className="flex items-end justify-between gap-5">
            <p className="text-sm font-bold text-[var(--muted)]">Subtotal</p>
            <p className="text-3xl font-black tracking-[-0.035em] tabular-nums text-[var(--foreground)]">{quote ? formatMoney(quote.subtotalCents) : "A calcular"}</p>
          </div>
          {fulfillmentMethod === "SHIPPING" ? (
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">O valor final inclui o frete confirmado pelo servidor antes da criação do Pix.</p>
          ) : null}
        </div>

        {quantityIsValid ? (
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-[var(--surface-strong)] p-4 text-xs leading-relaxed text-[var(--muted)]">
            <Info aria-hidden="true" size={17} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent)]" />
            {quantityMeters > product.customLeadTimeAboveMeters
              ? `O prazo de pedidos acima de ${product.customLeadTimeAboveMeters} metros é confirmado conforme a fila de produção.`
              : `O início da produção ocorre em até ${product.standardStartWithinBusinessHours} ${product.standardStartWithinBusinessHours === 1 ? "hora útil" : "horas úteis"} depois do Pix confirmado e da arte aprovada.`}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitState.status === "submitting" || !quote || !artworkAsset}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          {submitState.status === "submitting" ? (
            <>
              <span className="size-4 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
              Criando pedido
            </>
          ) : (
            <>
              <FileArrowUp aria-hidden="true" size={19} weight="bold" />
              Criar pedido e continuar
            </>
          )}
        </button>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
          <CheckCircle aria-hidden="true" size={16} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent)]" />
          O servidor recalcula o preço e exige a verificação do e-mail antes do Pix.
        </p>
      </aside>
    </form>
  );
}
