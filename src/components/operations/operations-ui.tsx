import type { ReactNode } from "react";
import {
  CheckCircle,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { LoadState, SemanticTone } from "./types";

const toneClasses: Record<SemanticTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900",
  danger:
    "border-rose-200 bg-rose-50 text-rose-800",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: SemanticTone;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-[color,background-color,border-color,transform] duration-(--duration-smooth) ease-premium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

type StatePanelProps = {
  state: Exclude<LoadState, "ready">;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

export function StatePanel({
  state,
  title,
  description,
  action,
  compact = false,
}: StatePanelProps) {
  const defaults = {
    loading: {
      title: "Carregando informações",
      description: "Aguarde enquanto os dados são atualizados.",
      icon: Info,
    },
    empty: {
      title: "Nenhum item por aqui",
      description: "Quando houver dados, eles aparecerão nesta área.",
      icon: Info,
    },
    error: {
      title: "Não foi possível carregar",
      description: "Tente novamente. Se o problema continuar, verifique a integração.",
      icon: WarningCircle,
    },
  } as const;

  const content = defaults[state];
  const Icon = content.icon;

  if (state === "loading") {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        className={`rounded-card border border-border bg-white shadow-premium ${
          compact ? "p-5" : "min-h-56 p-8"
        }`}
        role="status"
      >
        <span className="sr-only">{title ?? content.title}</span>
        <div className="flex items-start gap-4 motion-reduce:animate-none">
          <span className="size-11 shrink-0 animate-skeleton rounded-control bg-surface-strong motion-reduce:animate-none" />
          <span className="min-w-0 flex-1 space-y-3 pt-1">
            <span className="block h-3 w-40 max-w-full animate-skeleton rounded-full bg-surface-strong motion-reduce:animate-none" />
            <span className="block h-2.5 w-full max-w-lg animate-skeleton rounded-full bg-surface-strong motion-reduce:animate-none" />
            <span className="block h-2.5 w-3/5 animate-skeleton rounded-full bg-surface-strong motion-reduce:animate-none" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-live={state === "error" ? "assertive" : "polite"}
      className={`flex flex-col items-start rounded-card border border-border bg-white shadow-premium ${
        compact ? "gap-3 p-5" : "min-h-56 justify-center gap-4 p-8"
      }`}
      role={state === "error" ? "alert" : "status"}
    >
      <span className="grid size-10 place-items-center rounded-control bg-surface-strong text-foreground">
        <Icon
          aria-hidden="true"
          size={20}
          weight="bold"
        />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">
          {title ?? content.title}
        </p>
        <p className="max-w-xl text-sm leading-6 text-muted">
          {description ?? content.description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2
          className="text-lg font-bold tracking-tight text-foreground"
          id={id}
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CheckResultIcon({ complete }: { complete: boolean }) {
  return complete ? (
    <CheckCircle
      aria-hidden="true"
      className="shrink-0 text-emerald-600"
      size={20}
      weight="fill"
    />
  ) : (
    <WarningCircle
      aria-hidden="true"
      className="shrink-0 text-amber-600"
      size={20}
      weight="fill"
    />
  );
}

export const primaryButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-premium transition-[transform,background-color,box-shadow] ease-premium hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-premium-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition-[transform,border-color,background-color,box-shadow] ease-premium hover:-translate-y-0.5 hover:border-accent/45 hover:bg-surface-strong/60 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const inputClasses =
  "min-h-11 w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(28_78_96/0.04)] outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:bg-surface-strong";

export const labelClasses =
  "text-sm font-semibold text-foreground";
