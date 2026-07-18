"use client";

import { Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { CheckoutApiError, PaymentCreatedOrderResponse } from "./contracts";
import { PixPaymentPanel } from "./pix-payment-panel";

type VerifiedPixPaymentProps = {
  orderCode: string;
};

type State =
  | { status: "loading" }
  | { status: "success"; response: PaymentCreatedOrderResponse }
  | { status: "error"; message: string };

function responseError(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as CheckoutApiError).error;
    if (typeof error === "string") return error;
  }
  return "Não foi possível gerar o Pix.";
}

export function VerifiedPixPayment({ orderCode }: VerifiedPixPaymentProps) {
  const started = useRef(false);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void fetch(`/api/orders/${encodeURIComponent(orderCode)}/pix`, {
      method: "POST",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(payload));
        if (
          !payload ||
          typeof payload !== "object" ||
          (payload as { status?: unknown }).status !== "payment_created"
        ) {
          throw new Error("O servidor retornou uma cobrança inválida.");
        }
        setState({ status: "success", response: payload as PaymentCreatedOrderResponse });
      })
      .catch((error: unknown) => {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Não foi possível gerar o Pix.",
        });
      });
  }, [orderCode]);

  if (state.status === "loading") {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"
      >
        <span className="mx-auto block size-8 animate-pulse rounded-full bg-[var(--accent)] motion-reduce:animate-none" />
        <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-[var(--foreground)]">
          Preparando o Pix
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Seu e-mail foi verificado. Estamos confirmando o valor preservado no pedido.
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <Warning aria-hidden="true" className="mx-auto text-[var(--danger)]" size={42} weight="duotone" />
        <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-[var(--foreground)]">
          O pedido está seguro
        </h1>
        <p role="alert" className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {state.message}
        </p>
        <Link
          href={`/minha-conta/pedidos/${encodeURIComponent(orderCode)}`}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 font-bold text-[var(--accent-foreground)]"
        >
          Abrir meu pedido
        </Link>
      </section>
    );
  }

  return (
    <div>
      <PixPaymentPanel
        orderCode={state.response.orderCode}
        payment={state.response.payment}
      />
      <p className="mt-5 text-center text-sm text-[var(--muted)]">
        Você também pode acompanhar tudo em{" "}
        <Link
          href={`/minha-conta/pedidos/${encodeURIComponent(orderCode)}`}
          className="font-bold text-[var(--foreground)] underline decoration-[var(--accent)] underline-offset-4"
        >
          meus pedidos
        </Link>
        .
      </p>
    </div>
  );
}
