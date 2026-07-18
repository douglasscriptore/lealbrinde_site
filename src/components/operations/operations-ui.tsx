import type { ReactNode } from "react";
import {
  CheckCircle,
  Info,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { LoadState, SemanticTone } from "./types";

const toneClasses: Record<SemanticTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  danger:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
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
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
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
      icon: SpinnerGap,
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

  return (
    <div
      aria-live={state === "loading" ? "polite" : "assertive"}
      className={`flex flex-col items-start rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${
        compact ? "gap-3 p-5" : "min-h-56 justify-center gap-4 p-8"
      }`}
      role={state === "error" ? "alert" : "status"}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon
          aria-hidden="true"
          className={state === "loading" ? "animate-spin motion-reduce:animate-none" : ""}
          size={20}
          weight="bold"
        />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-slate-950 dark:text-white">
          {title ?? content.title}
        </p>
        <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
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
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2
          className="text-lg font-bold tracking-tight text-slate-950 dark:text-white"
          id={id}
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
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
      className="shrink-0 text-emerald-600 dark:text-emerald-400"
      size={20}
      weight="fill"
    />
  ) : (
    <WarningCircle
      aria-hidden="true"
      className="shrink-0 text-amber-600 dark:text-amber-400"
      size={20}
      weight="fill"
    />
  );
}

export const primaryButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#007FA8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#006B8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-slate-950";

export const secondaryButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 dark:ring-offset-slate-950";

export const dangerButtonClasses =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950 dark:ring-offset-slate-950";

export const inputClasses =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#008CB8] focus:ring-2 focus:ring-[#00AEEF]/30 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400 dark:disabled:bg-slate-900";

export const labelClasses =
  "text-sm font-semibold text-slate-800 dark:text-slate-100";
