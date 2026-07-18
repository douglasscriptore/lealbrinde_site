import {
  ArrowRight,
  Clock,
  Package,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import {
  primaryButtonClasses,
  secondaryButtonClasses,
  StatePanel,
  StatusBadge,
} from "./operations-ui";
import type {
  CustomerActionItem,
  CustomerOrderSummary,
  LoadState,
} from "./types";

export type CustomerDashboardProps = {
  customerName?: string;
  actions: CustomerActionItem[];
  activeOrders: CustomerOrderSummary[];
  completedOrders?: CustomerOrderSummary[];
  completedOrdersLimit?: number | null;
  state?: LoadState;
  newOrderHref: string;
  allOrdersHref?: string;
  errorMessage?: string;
};

function CustomerOrderList({
  orders,
  emptyMessage,
}: {
  orders: CustomerOrderSummary[];
  emptyMessage: string;
}) {
  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {orders.map((order) => (
          <li key={order.id}>
            <a
              className="group grid gap-4 p-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00AEEF] dark:hover:bg-slate-800/50 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center sm:p-5"
              href={order.href}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Package aria-hidden="true" size={21} />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#006E91] dark:text-[#72D9F7]">
                    {order.code}
                  </span>
                  <StatusBadge tone={order.statusTone}>{order.statusLabel}</StatusBadge>
                </span>
                <span className="mt-2 block truncate text-sm font-bold text-slate-900 dark:text-white">
                  {order.productName} · {order.quantityLabel}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Atualizado {order.updatedAtLabel}
                </span>
              </span>
              <span className="flex items-center justify-between gap-4 sm:block sm:text-right">
                <span className="block text-sm font-black text-slate-900 dark:text-white">
                  {order.totalLabel}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#006E91] dark:text-[#72D9F7]">
                  Ver pedido
                  <ArrowRight
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                    size={17}
                  />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerDashboard({
  customerName,
  actions,
  activeOrders,
  completedOrders = [],
  completedOrdersLimit = 4,
  state = "ready",
  newOrderHref,
  allOrdersHref = "/minha-conta/pedidos",
  errorMessage,
}: CustomerDashboardProps) {
  if (state === "loading") return <StatePanel state="loading" />;
  if (state === "error") {
    return <StatePanel description={errorMessage} state="error" />;
  }

  return (
    <div className="space-y-9">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {customerName ? `Olá, ${customerName}` : "Seus pedidos"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Acompanhe correções, produção, entrega e documentos em um só lugar.
          </p>
        </div>
        <a className={primaryButtonClasses} href={newOrderHref}>
          <Plus aria-hidden="true" size={18} weight="bold" />
          Novo pedido DTF
        </a>
      </header>

      <section aria-labelledby="customer-actions-title">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <WarningCircle aria-hidden="true" size={21} weight="fill" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight" id="customer-actions-title">
              Precisa da sua ação
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Resolva estas pendências para o pedido continuar.
            </p>
          </div>
        </div>
        {actions.length ? (
          <ul className="mt-5 space-y-3">
            {actions.map((action) => (
              <li key={action.id}>
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-black text-amber-800 dark:text-amber-200">
                      {action.orderCode}
                    </p>
                    <h3 className="mt-1 font-bold text-amber-950 dark:text-amber-50">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
                      {action.description}
                    </p>
                    {action.dueLabel ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                        <Clock aria-hidden="true" size={15} />
                        {action.dueLabel}
                      </p>
                    ) : null}
                  </div>
                  <a
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 active:translate-y-px dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100 dark:ring-offset-amber-950"
                    href={action.href}
                  >
                    {action.actionLabel}
                    <ArrowRight aria-hidden="true" size={18} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            Nenhuma pendência precisa da sua ação agora.
          </div>
        )}
      </section>

      <section aria-labelledby="active-orders-title">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight" id="active-orders-title">
              Em andamento
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pedidos que ainda estão no fluxo de pagamento, revisão ou produção.
            </p>
          </div>
          <a className={secondaryButtonClasses} href={allOrdersHref}>
            Ver todos
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        </div>
        <CustomerOrderList
          emptyMessage="Você não possui pedidos em andamento."
          orders={activeOrders}
        />
      </section>

      {completedOrders.length ? (
        <section aria-labelledby="completed-orders-title">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight" id="completed-orders-title">
              Pedidos concluídos
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Consulte documentos e refaça pedidos anteriores.
            </p>
          </div>
          <CustomerOrderList
            emptyMessage="Nenhum pedido concluído."
            orders={
              completedOrdersLimit === null
                ? completedOrders
                : completedOrders.slice(0, completedOrdersLimit)
            }
          />
        </section>
      ) : null}
    </div>
  );
}
