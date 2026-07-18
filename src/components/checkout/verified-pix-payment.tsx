"use client";

import { Warning } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
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
  const shouldReduceMotion = useReducedMotion();
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
      <motion.section
        aria-live="polite"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card border border-border bg-surface p-8 text-center shadow-premium"
      >
        <span className="mx-auto grid size-10 place-items-center rounded-control bg-accent-soft">
          <span className="size-4 animate-skeleton rounded-full bg-accent motion-reduce:animate-none" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-foreground">
          Preparando o Pix
        </h1>
        <p className="mt-3 text-sm text-muted">
          Seu e-mail foi verificado. Estamos confirmando o valor preservado no pedido.
        </p>
      </motion.section>
    );
  }

  if (state.status === "error") {
    return (
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card border border-border bg-surface p-8 text-center shadow-premium"
      >
        <Warning aria-hidden="true" className="mx-auto text-danger" size={42} weight="duotone" />
        <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-foreground">
          O pedido está seguro
        </h1>
        <p role="alert" className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {state.message}
        </p>
        <Link
          href={`/minha-conta/pedidos/${encodeURIComponent(orderCode)}`}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground shadow-premium transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-accent-strong hover:shadow-premium-hover active:scale-[0.98]"
        >
          Abrir meu pedido
        </Link>
      </motion.section>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <PixPaymentPanel
        orderCode={state.response.orderCode}
        payment={state.response.payment}
      />
      <p className="mt-5 text-center text-sm text-muted">
        Você também pode acompanhar tudo em{" "}
        <Link
          href={`/minha-conta/pedidos/${encodeURIComponent(orderCode)}`}
          className="font-bold text-foreground underline decoration-[var(--accent)] underline-offset-4"
        >
          meus pedidos
        </Link>
        .
      </p>
    </motion.div>
  );
}
