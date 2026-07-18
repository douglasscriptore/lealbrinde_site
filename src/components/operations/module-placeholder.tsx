import {
  ArrowRight,
  CheckCircle,
  ClockCountdown,
} from "@phosphor-icons/react/dist/ssr";

import { secondaryButtonClasses, StatusBadge } from "./operations-ui";

export type AdminModulePlaceholderProps = {
  title: string;
  description: string;
  capabilities: string[];
  nextStep: string;
  backHref?: string;
};

export function AdminModulePlaceholder({
  title,
  description,
  capabilities,
  nextStep,
  backHref = "/admin",
}: AdminModulePlaceholderProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] md:p-8">
        <div>
          <StatusBadge tone="info">Módulo previsto</StatusBadge>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
          <a className={`${secondaryButtonClasses} mt-6`} href={backHref}>
            Voltar à visão geral
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        </div>

        <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <ClockCountdown aria-hidden="true" className="text-[#007FA8]" size={22} />
            <h3 className="font-bold text-slate-950 dark:text-white">Escopo preparado</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {capabilities.map((capability) => (
              <li className="flex gap-2.5 text-sm leading-5 text-slate-700 dark:text-slate-200" key={capability}>
                <CheckCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  size={18}
                  weight="fill"
                />
                {capability}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Próximo passo: {nextStep}
          </p>
        </div>
      </div>
    </section>
  );
}
