import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  DownloadSimple,
  File,
  Headset,
  MapPin,
  Package,
  Receipt,
  Repeat,
} from "@phosphor-icons/react/dist/ssr";

import { OrderTimeline } from "./orders";
import {
  primaryButtonClasses,
  secondaryButtonClasses,
  StatePanel,
  StatusBadge,
} from "./operations-ui";
import type { CustomerOrderDetailData, LoadState } from "./types";

export type OrderDetailProps = {
  order?: CustomerOrderDetailData;
  state?: LoadState;
  backHref?: string;
  errorMessage?: string;
};

export function OrderDetail({
  order,
  state = "ready",
  backHref = "/minha-conta/pedidos",
  errorMessage,
}: OrderDetailProps) {
  if (state === "loading") return <StatePanel state="loading" />;
  if (state === "error" || !order) {
    return (
      <StatePanel
        action={
          <a className={secondaryButtonClasses} href={backHref}>
            <ArrowLeft aria-hidden="true" size={18} />
            Voltar aos pedidos
          </a>
        }
        description={errorMessage}
        state="error"
        title="Pedido indisponível"
      />
    );
  }

  return (
    <div className="space-y-7">
      <a
        className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        href={backHref}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Voltar aos pedidos
      </a>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm font-black text-accent-strong">
              {order.code}
            </p>
            <StatusBadge tone={order.statusTone}>{order.statusLabel}</StatusBadge>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {order.productName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pedido realizado {order.placedAtLabel}
          </p>
        </div>
        <p className="text-2xl font-black tracking-tight text-slate-950">
          {order.totalLabel}
        </p>
      </header>

      {order.action ? (
        <section
          aria-labelledby="order-action-title"
          className="flex flex-col gap-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-amber-950" id="order-action-title">
              {order.action.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-900/80">
              {order.action.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.action.secondaryHref && order.action.secondaryLabel ? (
              <a
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                href={order.action.secondaryHref}
              >
                {order.action.secondaryLabel}
              </a>
            ) : null}
            <a
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
              href={order.action.href}
            >
              {order.action.actionLabel}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.65fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <OrderTimeline events={order.timeline} />
          </section>

          <section
            aria-labelledby="order-files-title"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            id="arquivos"
          >
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black tracking-tight" id="order-files-title">
                Arquivos e versões
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada reenvio permanece registrado no histórico do pedido.
              </p>
            </div>
            {order.files.length ? (
              <ul className="mt-4 space-y-3">
                {order.files.map((file) => (
                  <li
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                    key={file.id}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                      <File aria-hidden="true" size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">{file.name}</p>
                        <StatusBadge tone={file.statusTone}>{file.statusLabel}</StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {file.versionLabel}, enviado {file.submittedAtLabel}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {file.downloadHref ? (
                        <a
                          aria-label={`Baixar ${file.name}`}
                          className="grid size-11 place-items-center rounded-xl border border-slate-300 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          href={file.downloadHref}
                        >
                          <DownloadSimple aria-hidden="true" size={19} />
                        </a>
                      ) : null}
                      {file.replaceHref ? (
                        <a className={secondaryButtonClasses} href={file.replaceHref}>
                          Substituir arquivo
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <StatePanel compact state="empty" title="Nenhum arquivo disponível" />
              </div>
            )}
          </section>
        </div>

        <aside aria-label="Resumo do pedido" className="space-y-4">
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5"
            id="pagamento"
          >
            <div className="flex items-center gap-3">
              <Package aria-hidden="true" className="text-accent" size={22} />
              <h2 className="font-black">Resumo</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Quantidade</dt>
                <dd className="font-bold">{order.quantityLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Valor unitário</dt>
                <dd className="font-bold">{order.unitPriceLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="font-bold">{order.subtotalLabel}</dd>
              </div>
              {order.shippingLabel ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Entrega</dt>
                  <dd className="font-bold">{order.shippingLabel}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-black">{order.totalLabel}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Receipt aria-hidden="true" className="text-accent" size={22} />
              <h2 className="font-black">Pagamento</h2>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">
                {order.payment.methodLabel}
              </span>
              <StatusBadge tone={order.payment.statusTone}>
                {order.payment.statusLabel}
              </StatusBadge>
            </div>
            {order.payment.paidAtLabel ? (
              <p className="mt-3 text-xs text-slate-500">
                Confirmado {order.payment.paidAtLabel}
              </p>
            ) : null}
            {order.payment.receiptHref ? (
              <a className={`${secondaryButtonClasses} mt-4 w-full`} href={order.payment.receiptHref}>
                <DownloadSimple aria-hidden="true" size={18} />
                Baixar comprovante
              </a>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <MapPin aria-hidden="true" className="text-accent" size={22} />
              <h2 className="font-black">Recebimento</h2>
            </div>
            <p className="mt-4 text-sm font-bold">{order.fulfillment.methodLabel}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {order.fulfillment.addressOrPickupLabel}
            </p>
            <p className="mt-3 text-sm font-semibold text-accent-strong">
              {order.fulfillment.statusLabel}
            </p>
            {order.fulfillment.trackingCode ? (
              <p className="mt-2 font-mono text-xs text-slate-500">
                Rastreio: {order.fulfillment.trackingCode}
              </p>
            ) : null}
            {order.fulfillment.trackingHref ? (
              <a className={`${secondaryButtonClasses} mt-4 w-full`} href={order.fulfillment.trackingHref}>
                <ArrowSquareOut aria-hidden="true" size={18} />
                Acompanhar entrega
              </a>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Receipt aria-hidden="true" className="text-accent" size={22} />
              <h2 className="font-black">Documentos fiscais</h2>
            </div>
            {order.documents.length ? (
              <ul className="mt-4 space-y-2">
                {order.documents.map((document) => (
                  <li key={document.id}>
                    <a
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={document.downloadHref}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{document.title}</span>
                        {document.numberLabel ? (
                          <span className="mt-0.5 block font-mono text-xs font-normal text-slate-500">
                            {document.numberLabel}
                          </span>
                        ) : null}
                      </span>
                      <DownloadSimple aria-hidden="true" className="shrink-0" size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Nenhum documento foi disponibilizado ainda.
              </p>
            )}
          </section>
        </aside>
      </div>

      <footer className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {order.supportHref ? (
          <a className={secondaryButtonClasses} href={order.supportHref}>
            <Headset aria-hidden="true" size={18} />
            Falar com atendimento
          </a>
        ) : <span />}
        {order.reorderHref ? (
          <a className={primaryButtonClasses} href={order.reorderHref}>
            <Repeat aria-hidden="true" size={18} />
            Refazer pedido
          </a>
        ) : null}
      </footer>
    </div>
  );
}
