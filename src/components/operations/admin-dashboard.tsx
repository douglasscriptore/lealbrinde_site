import {
  ArrowRight,
  CheckCircle,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import {
  SectionHeader,
  StatePanel,
  StatusBadge,
  secondaryButtonClasses,
} from "./operations-ui";
import type {
  LoadState,
  OperationsAlert,
  OperationsOrder,
  OperationsOrderStatus,
  PendingQueueItem,
  SemanticTone,
} from "./types";

export type OperationsDashboardProps = {
  state?: LoadState;
  operatorName?: string;
  queues: PendingQueueItem[];
  alerts?: OperationsAlert[];
  recentOrders?: OperationsOrder[];
  allOrdersHref?: string;
  errorMessage?: string;
};

const queueToneClasses: Record<SemanticTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-800",
  success:
    "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
};

const orderTone: Record<OperationsOrderStatus, SemanticTone> = {
  ACTION_REQUIRED: "danger",
  PENDING_PAYMENT: "warning",
  ARTWORK_REVIEW: "info",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
  IN_PRODUCTION: "info",
  READY_FOR_PICKUP: "success",
  SHIPPED: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export function OperationsDashboard({
  state = "ready",
  operatorName,
  queues,
  alerts = [],
  recentOrders = [],
  allOrdersHref = "/admin/pedidos",
  errorMessage,
}: OperationsDashboardProps) {
  if (state === "loading") return <StatePanel state="loading" />;
  if (state === "error") {
    return <StatePanel description={errorMessage} state="error" />;
  }
  if (state === "empty") {
    return (
      <StatePanel
        description="O painel ficará disponível assim que houver pedidos ou configurações publicadas."
        state="empty"
        title="Operação ainda sem dados"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="pending-title">
        <SectionHeader
          description={`${operatorName ? `${operatorName}, e` : "E"}stas são as filas que precisam de atenção agora.`}
          id="pending-title"
          title="Pendências da operação"
        />
        {queues.length ? (
          <div className="mt-5 overflow-hidden rounded-card border border-border bg-white shadow-premium">
            <ul className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:[&>li:nth-child(odd)]:border-r md:[&>li:nth-child(odd)]:border-slate-200 xl:grid-cols-4 xl:divide-y-0 xl:[&>li]:border-r xl:[&>li]:border-slate-200 xl:[&>li:last-child]:border-r-0">
              {queues.map((queue) => (
                <li key={queue.id}>
                  <a
                    className="group flex min-h-40 flex-col justify-between gap-5 p-5 transition-colors hover:bg-surface-strong/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    href={queue.href}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`grid min-w-12 place-items-center rounded-xl px-3 py-2 text-xl font-black ${queueToneClasses[queue.tone ?? "neutral"]}`}
                      >
                        {queue.count}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="mt-2 text-slate-400 transition-transform group-hover:translate-x-1"
                        size={18}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950">
                        {queue.label}
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {queue.description}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-5">
            <StatePanel
              compact
              description="Nenhuma fila está aguardando ação da equipe."
              state="empty"
              title="Operação em dia"
            />
          </div>
        )}
      </section>

      {alerts.length ? (
        <section aria-labelledby="alerts-title">
          <SectionHeader id="alerts-title" title="Alertas" />
          <div className="mt-5 space-y-3">
            {alerts.map((alert) => {
              const Icon = alert.tone === "success" ? CheckCircle : WarningCircle;
              return (
                <div
                  className="flex flex-col gap-4 rounded-card border border-border bg-white p-5 shadow-premium sm:flex-row sm:items-center"
                  key={alert.id}
                  role={alert.tone === "danger" ? "alert" : "status"}
                >
                  <Icon
                    aria-hidden="true"
                    className={
                      alert.tone === "danger"
                        ? "text-rose-600"
                        : alert.tone === "warning"
                          ? "text-amber-600"
                          : alert.tone === "success"
                            ? "text-emerald-600"
                            : "text-sky-600"
                    }
                    size={24}
                    weight="fill"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-950">
                      {alert.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {alert.description}
                    </p>
                  </div>
                  {alert.href && alert.actionLabel ? (
                    <a className={secondaryButtonClasses} href={alert.href}>
                      {alert.actionLabel}
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="recent-orders-title">
        <SectionHeader
          action={
            <a className={secondaryButtonClasses} href={allOrdersHref}>
              Ver pedidos
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          }
          description="Últimas movimentações registradas pela operação."
          id="recent-orders-title"
          title="Pedidos recentes"
        />
        {recentOrders.length ? (
          <div className="mt-5 overflow-hidden rounded-card border border-border bg-white shadow-premium">
            <ul className="divide-y divide-slate-200">
              {recentOrders.slice(0, 6).map((order) => (
                <li key={order.id}>
                  <a
                    className="grid gap-3 p-4 transition-colors hover:bg-surface-strong/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:grid-cols-[8rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5"
                    href={order.detailHref}
                  >
                    <span className="font-mono text-sm font-bold text-slate-950">
                      {order.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {order.customerName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {order.productName}, {order.quantityLabel}
                      </span>
                    </span>
                    <StatusBadge tone={orderTone[order.status]}>
                      {order.statusLabel}
                    </StatusBadge>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock aria-hidden="true" size={15} />
                      {order.updatedAtLabel}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-5">
            <StatePanel compact state="empty" title="Nenhum pedido recente" />
          </div>
        )}
      </section>
    </div>
  );
}
