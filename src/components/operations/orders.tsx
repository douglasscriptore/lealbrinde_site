import type { ComponentProps, ReactNode } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  DownloadSimple,
  Eye,
  FileImage,
  FunnelSimple,
  MagnifyingGlass,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";

import {
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
  StatePanel,
  StatusBadge,
} from "./operations-ui";
import type {
  ArtworkReviewData,
  LoadState,
  OperationsOrder,
  OperationsOrderStatus,
  OrderTimelineEvent,
  SemanticTone,
  TimelineEventState,
} from "./types";

export type OrderFilter = {
  label: string;
  href: string;
  active?: boolean;
  count?: number;
};

export type OrderQueueProps = {
  title: string;
  description?: string;
  orders: OperationsOrder[];
  state?: LoadState;
  filters?: OrderFilter[];
  searchAction?: string;
  query?: string;
  errorMessage?: string;
  headerAction?: ReactNode;
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

export function OrderStatusBadge({ order }: { order: OperationsOrder }) {
  return <StatusBadge tone={orderTone[order.status]}>{order.statusLabel}</StatusBadge>;
}

export function OrderQueue({
  title,
  description,
  orders,
  state = "ready",
  filters = [],
  searchAction = "/admin/pedidos",
  query,
  errorMessage,
  headerAction,
}: OrderQueueProps) {
  return (
    <section aria-labelledby="order-queue-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight" id="order-queue-title">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {headerAction}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form action={searchAction} className="w-full max-w-xl" method="get" role="search">
          <label className="sr-only" htmlFor="order-search">
            Buscar por código ou cliente
          </label>
          <div className="flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <MagnifyingGlass
              aria-hidden="true"
              className="ml-3.5 text-slate-500"
              size={19}
            />
            <input
              className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-500"
              defaultValue={query}
              id="order-search"
              name="q"
              placeholder="Buscar pedidos"
              type="search"
            />
            <button
              className="mr-1 min-h-9 rounded-lg px-3 text-sm font-bold text-accent-strong hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              type="submit"
            >
              Buscar
            </button>
          </div>
        </form>

        {filters.length ? (
          <nav aria-label="Filtrar pedidos" className="overflow-x-auto">
            <ul className="flex min-w-max items-center gap-2">
              <li className="mr-1 flex items-center text-xs font-bold text-slate-500">
                <FunnelSimple aria-hidden="true" className="mr-1.5" size={16} />
                Filtros
              </li>
              {filters.map((filter) => (
                <li key={filter.href}>
                  <a
                    aria-current={filter.active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      filter.active
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    href={filter.href}
                  >
                    {filter.label}
                    {typeof filter.count === "number" ? (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                        {filter.count}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      {state === "loading" ? <StatePanel state="loading" /> : null}
      {state === "error" ? (
        <StatePanel description={errorMessage} state="error" />
      ) : null}
      {state === "empty" || (state === "ready" && orders.length === 0) ? (
        <StatePanel
          description={
            query
              ? "Nenhum pedido corresponde aos filtros atuais."
              : "Os próximos pedidos aparecerão nesta fila."
          }
          state="empty"
          title={query ? "Nenhum resultado" : "Fila vazia"}
        />
      ) : null}

      {state === "ready" && orders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-200">
            {orders.map((order) => (
              <li key={order.id}>
                <a
                  className="group grid gap-4 p-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:grid-cols-[8rem_minmax(0,1.3fr)_minmax(10rem,0.7fr)_auto] md:items-center md:p-5"
                  href={order.detailHref}
                >
                  <div>
                    <span className="font-mono text-sm font-black text-slate-950">
                      {order.code}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {order.updatedAtLabel}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {order.customerName}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {order.productName}, {order.quantityLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:block">
                    <OrderStatusBadge order={order} />
                    <p className="text-sm font-bold text-slate-900 md:mt-2">
                      {order.totalLabel}
                    </p>
                  </div>
                  <span className="flex min-h-10 items-center justify-between gap-2 text-sm font-bold text-accent-strong md:justify-end">
                    {order.actionLabel ?? "Ver pedido"}
                    <ArrowRight
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                      size={18}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const timelineAppearance: Record<
  TimelineEventState,
  { icon: typeof Check; iconClass: string; lineClass: string }
> = {
  complete: {
    icon: Check,
    iconClass: "bg-emerald-600 text-white",
    lineClass: "bg-emerald-300",
  },
  current: {
    icon: Clock,
    iconClass: "bg-accent text-white",
    lineClass: "bg-slate-200",
  },
  pending: {
    icon: Clock,
    iconClass: "bg-slate-100 text-slate-500",
    lineClass: "bg-slate-200",
  },
  issue: {
    icon: WarningCircle,
    iconClass: "bg-amber-100 text-amber-700",
    lineClass: "bg-slate-200",
  },
};

export function OrderTimeline({
  events,
  title = "Andamento do pedido",
}: {
  events: OrderTimelineEvent[];
  title?: string;
}) {
  if (!events.length) {
    return <StatePanel compact state="empty" title="Sem eventos registrados" />;
  }

  return (
    <section aria-labelledby="order-timeline-title">
      <h2 className="text-lg font-black tracking-tight" id="order-timeline-title">
        {title}
      </h2>
      <ol className="mt-5">
        {events.map((event, index) => {
          const appearance = timelineAppearance[event.state];
          const Icon = appearance.icon;
          const isLast = index === events.length - 1;

          return (
            <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-6" key={event.id}>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-[1.2rem] top-10 w-px ${appearance.lineClass}`}
                />
              ) : null}
              <span
                className={`relative z-10 grid size-10 place-items-center rounded-full ${appearance.iconClass}`}
              >
                <Icon aria-hidden="true" size={18} weight="bold" />
              </span>
              <div className="pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {event.title}
                  </h3>
                  {event.occurredAtLabel ? (
                    <time className="text-xs text-slate-500">
                      {event.occurredAtLabel}
                    </time>
                  ) : null}
                </div>
                {event.description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export type ArtworkReviewPanelProps = {
  review: ArtworkReviewData;
  reviewAction?: ComponentProps<"form">["action"];
  isSubmitting?: boolean;
  errorMessage?: string;
  successMessage?: string;
  reviewLockedMessage?: string;
  correctionCategories?: Array<{ value: string; label: string }>;
};

const checkPresentation = {
  passed: { label: "Validado", tone: "success" as const, icon: CheckCircle },
  warning: { label: "Atenção", tone: "warning" as const, icon: WarningCircle },
  failed: { label: "Bloqueado", tone: "danger" as const, icon: XCircle },
};

export function ArtworkReviewPanel({
  review,
  reviewAction,
  isSubmitting = false,
  errorMessage,
  successMessage,
  reviewLockedMessage,
  correctionCategories = [
    { value: "DIMENSIONS", label: "Dimensões ou proporção" },
    { value: "RESOLUTION", label: "Resolução insuficiente" },
    { value: "TRANSPARENCY", label: "Fundo ou transparência" },
    { value: "COLORS", label: "Cores ou perfil" },
    { value: "FONTS", label: "Fontes ou textos" },
    { value: "OTHER", label: "Outro ajuste" },
  ],
}: ArtworkReviewPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-black text-accent-strong">
                {review.orderCode}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight">Revisão da arte</h2>
              <p className="mt-1 text-sm text-slate-600">
                {review.customerName}, {review.productName}, {review.quantityLabel}
              </p>
            </div>
            <StatusBadge tone="info">{review.versionLabel}</StatusBadge>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-slate-600 shadow-sm">
              <FileImage aria-hidden="true" size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                {review.fileName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {review.fileSizeLabel}, enviado {review.submittedAtLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {review.previewHref ? (
                <a className={secondaryButtonClasses} href={review.previewHref}>
                  <Eye aria-hidden="true" size={18} />
                  Visualizar
                </a>
              ) : null}
              <a className={secondaryButtonClasses} href={review.downloadHref}>
                <DownloadSimple aria-hidden="true" size={18} />
                Baixar
              </a>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-bold">Validações automáticas</h3>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {review.automaticChecks.map((check) => {
                const presentation = checkPresentation[check.result];
                const Icon = presentation.icon;
                return (
                  <li
                    className="flex gap-3 rounded-xl border border-slate-200 p-4"
                    key={check.id}
                  >
                    <Icon
                      aria-hidden="true"
                      className={
                        check.result === "passed"
                          ? "text-emerald-600"
                          : check.result === "warning"
                            ? "text-amber-600"
                            : "text-rose-600"
                      }
                      size={20}
                      weight="fill"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{check.label}</p>
                        <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                      </div>
                      {check.detail ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {check.detail}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black tracking-tight">Decisão da revisão</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          A aprovação humana libera a arte. A produção só começa quando o Pix também estiver confirmado.
        </p>

        <form action={reviewAction} aria-busy={isSubmitting} className="mt-5 space-y-5">
          <input name="orderId" type="hidden" value={review.orderId} />
          <input name="versionId" type="hidden" value={review.versionId} />
          <div className="grid gap-2">
            <label className={labelClasses} htmlFor="review-category">
              Motivo da correção
            </label>
            <select className={inputClasses} id="review-category" name="category">
              <option value="">Selecione se houver correção</option>
              {correctionCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className={labelClasses} htmlFor="review-comment">
              Orientação ao cliente
            </label>
            <textarea
              className={`${inputClasses} min-h-36 resize-y`}
              id="review-comment"
              name="comment"
              placeholder="Explique objetivamente o que precisa ser alterado."
            />
            <p className="text-xs leading-5 text-slate-500">
              Obrigatória ao solicitar correção. Não inclua observações internas.
            </p>
          </div>
          <div className="grid gap-2">
            <label className={labelClasses} htmlFor="review-reference-url">
              Arquivo de referência
            </label>
            <input
              className={inputClasses}
              id="review-reference-url"
              name="referenceUrl"
              placeholder="URL privada opcional"
              type="url"
            />
          </div>

          {errorMessage ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
              role="status"
            >
              {successMessage}
            </p>
          ) : null}
          {reviewLockedMessage ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              {reviewLockedMessage}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button
              className={secondaryButtonClasses}
              disabled={isSubmitting || Boolean(reviewLockedMessage)}
              name="decision"
              type="submit"
              value="CHANGES_REQUESTED"
            >
              <WarningCircle aria-hidden="true" size={18} />
              Solicitar correção
            </button>
            <button
              className={primaryButtonClasses}
              disabled={isSubmitting || Boolean(reviewLockedMessage)}
              name="decision"
              type="submit"
              value="APPROVED"
            >
              <Check aria-hidden="true" size={18} weight="bold" />
              Aprovar arte
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
