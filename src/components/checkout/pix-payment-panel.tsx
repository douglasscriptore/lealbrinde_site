"use client";

import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Flask,
  QrCode,
  Warning,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { CheckoutPaymentStatus, CheckoutPixPayment } from "./contracts";

type PixPaymentPanelProps = {
  orderCode: string;
  payment: CheckoutPixPayment;
};

const statusContent: Record<
  CheckoutPaymentStatus,
  { label: string; description: string; tone: "neutral" | "success" | "danger" }
> = {
  PENDING_PIX: {
    label: "Aguardando Pix",
    description: "A confirmação acontece automaticamente depois do pagamento.",
    tone: "neutral",
  },
  PAID: {
    label: "Pagamento confirmado",
    description: "Seu arquivo seguirá para a revisão técnica humana.",
    tone: "success",
  },
  EXPIRED: {
    label: "Pix expirado",
    description: "Gere uma nova cobrança antes de continuar.",
    tone: "danger",
  },
  FAILED: {
    label: "Pagamento não concluído",
    description: "Não houve cobrança. Tente novamente pelo pedido.",
    tone: "danger",
  },
  REFUNDED: {
    label: "Pagamento devolvido",
    description: "A devolução foi registrada neste pedido.",
    tone: "neutral",
  },
};

const toneClasses = {
  neutral: "border-border bg-surface-strong text-foreground",
  success:
    "border-[color-mix(in_srgb,var(--success)_40%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] text-success",
  danger:
    "border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_9%,var(--surface))] text-danger",
} as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatRemainingTime(milliseconds: number) {
  if (milliseconds <= 0) return "Expirado";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PixPaymentPanel({ orderCode, payment }: PixPaymentPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const status = statusContent[payment.status];
  const expirationDate = useMemo(() => new Date(payment.expiresAt), [payment.expiresAt]);
  const remainingTime = now === null ? null : expirationDate.getTime() - now;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(payment.copyPasteCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  }

  const StatusIcon = payment.status === "PAID" ? CheckCircle : payment.status === "PENDING_PIX" ? Clock : Warning;

  return (
    <section aria-labelledby="pix-title" className="rounded-card border border-border bg-surface p-6 shadow-premium sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-muted">Pedido {orderCode}</p>
          <h2 id="pix-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-foreground">
            Pagamento via Pix
          </h2>
        </div>
        <motion.div
          key={payment.status}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-flex max-w-max items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${toneClasses[status.tone]}`}
        >
          <StatusIcon aria-hidden="true" size={17} weight="fill" />
          {status.label}
        </motion.div>
      </div>

      <p aria-live="polite" className="mt-5 text-sm leading-relaxed text-muted">
        {status.description}
      </p>

      {payment.sandbox ? (
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_38%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_9%,var(--surface))] p-5">
          <Flask aria-hidden="true" size={25} weight="duotone" className="shrink-0 text-warning" />
          <div>
            <p className="font-bold text-foreground">Ambiente de homologação</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Este código é somente para testar a jornada. Nenhum pagamento real será processado e nenhum QR Code é exibido.
            </p>
          </div>
        </div>
      ) : payment.qrCodeBase64 ? (
        <div className="mt-7 flex justify-center rounded-2xl border border-border bg-white p-5">
          <Image
            src={`data:image/png;base64,${payment.qrCodeBase64}`}
            alt="QR Code do Pix deste pedido"
            width={240}
            height={240}
            unoptimized
            className="size-60"
          />
        </div>
      ) : (
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-surface-strong p-5">
          <QrCode aria-hidden="true" size={24} weight="duotone" className="shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-muted">
            Use o código copia e cola abaixo para realizar o pagamento.
          </p>
        </div>
      )}

      <dl className="mt-7 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Valor</dt>
          <dd className="mt-1 text-xl font-black tabular-nums text-foreground">
            {currencyFormatter.format(payment.amountMinor / 100)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Expira em</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {dateTimeFormatter.format(expirationDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Tempo restante</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {remainingTime === null ? "Calculando" : formatRemainingTime(remainingTime)}
          </dd>
        </div>
      </dl>

      <div className="mt-7">
        <label htmlFor="pix-copy-code" className="text-sm font-bold text-foreground">
          Pix copia e cola
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="pix-copy-code"
            readOnly
            value={payment.copyPasteCode}
            className="h-12 min-w-0 flex-1 rounded-control border border-border bg-background px-4 font-mono text-xs text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
          />
          <button
            type="button"
            onClick={copyPixCode}
            className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground shadow-premium transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-accent-strong hover:shadow-premium-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground active:translate-y-px active:scale-[0.98]"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={copyState === "copied" ? "copied" : "copy"}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-2"
              >
                {copyState === "copied" ? <Check aria-hidden="true" size={18} weight="bold" /> : <Copy aria-hidden="true" size={18} weight="bold" />}
                {copyState === "copied" ? "Código copiado" : "Copiar código"}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
        {copyState === "error" ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            Não foi possível copiar automaticamente. Selecione o código e copie manualmente.
          </p>
        ) : null}
      </div>
    </section>
  );
}
