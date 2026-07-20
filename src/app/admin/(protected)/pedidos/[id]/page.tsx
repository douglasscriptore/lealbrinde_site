import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  DownloadSimple,
  FileImage,
  Package,
  Receipt,
} from "@phosphor-icons/react/dist/ssr";

import {
  FiscalDocumentUpload,
  OrderStatusBadge,
  OrderTimeline,
  secondaryButtonClasses,
  StatePanel,
  StatusBadge,
} from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminOrderDetail } from "@/server/queries/admin-operations";

import {
  refundPaymentAction,
  updateOrderWorkflowAction,
} from "../../actions";

export const metadata: Metadata = { title: "Detalhe do pedido" };

type OrderPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
};

export default async function AdminOrderPage({
  params,
  searchParams,
}: OrderPageProps) {
  const session = await requireStaff();
  const [{ id }, feedback] = await Promise.all([params, searchParams]);
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600"
        href="/admin/pedidos"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Voltar aos pedidos
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm font-black text-accent-strong">
              {detail.order.code}
            </p>
            <OrderStatusBadge order={detail.order} />
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {detail.order.customerName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {detail.order.productName}, {detail.order.quantityLabel}
          </p>
        </div>
        <p className="text-2xl font-black tracking-tight">
          {detail.order.totalLabel}
        </p>
      </header>

      {feedback.erro ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
          role="alert"
        >
          {feedback.erro.slice(0, 500)}
        </p>
      ) : null}
      {feedback.sucesso ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
          role="status"
        >
          {feedback.sucesso.slice(0, 300)}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <OrderTimeline events={detail.timeline} title="Histórico operacional" />
        </section>

        <aside className="space-y-4" aria-label="Estados do pedido">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Package aria-hidden="true" className="text-accent" size={22} />
              <h2 className="font-black">Estados independentes</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <StatusRow label="Pagamento" value={detail.paymentStatusLabel} />
              <StatusRow label="Arte" value={detail.artworkStatusLabel} />
              <StatusRow label="Produção" value={detail.productionStatusLabel} />
              <StatusRow label="Recebimento" value={detail.fulfillmentStatusLabel} />
            </dl>
            <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
              Modalidade: <strong>{detail.fulfillmentMethodLabel}</strong>
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {detail.isDtfOrder ? (
                <>
                  Até {detail.customLeadTimeAboveMeters} metros, o início ocorre em até{" "}
                  {detail.standardStartWithinBusinessHours}{" "}
                  {detail.standardStartWithinBusinessHours === 1
                    ? "hora útil"
                    : "horas úteis"}{" "}
                  depois do Pix e da arte aprovados. Acima desse volume, o prazo é manual.
                </>
              ) : (
                "A produção é liberada depois do pagamento e da aprovação da personalização."
              )}
            </p>
            {detail.manualLeadTimeNote ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                {detail.manualLeadTimeNote}
              </p>
            ) : null}
          </section>

          {detail.canViewFiscal ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Receipt aria-hidden="true" className="text-accent" size={22} />
                <h2 className="font-black">Financeiro e fiscal</h2>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                {detail.paymentAttempts.length} tentativa(s) de pagamento e{" "}
                {detail.fiscalDocumentCount} documento(s) fiscal(is).
              </p>
              {detail.fiscalData ? (
                <dl className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
                  <StatusRow
                    label="Nota fiscal"
                    value={detail.fiscalData.requested ? "Solicitada" : "Dados do pedido"}
                  />
                  {detail.fiscalData.requested ? (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Pessoa</dt>
                        <dd className="font-bold">{detail.fiscalData.partyType}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Nome ou razão social</dt>
                        <dd className="text-right font-bold">{detail.fiscalData.legalName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">CPF ou CNPJ</dt>
                        <dd className="font-mono font-bold">{detail.fiscalData.document}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              ) : null}
              {detail.fiscalDocuments.length ? (
                <ul className="mt-4 space-y-2">
                  {detail.fiscalDocuments.map((document) => (
                    <li key={document.id}>
                      <a
                        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-bold"
                        href={document.downloadHref}
                      >
                        <span>
                          {document.title}, {document.versionLabel}
                          {document.current ? ", atual" : ""}
                        </span>
                        <DownloadSimple aria-hidden="true" size={18} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {detail.paymentStatus === "PAID" &&
              ["BLOCKED", "QUEUED"].includes(detail.productionStatus) ? (
                <form action={refundPaymentAction} className="mt-4">
                  <input name="orderId" type="hidden" value={detail.order.id} />
                  <label className="mb-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                    <input className="mt-1" name="confirmRefund" required type="checkbox" value="true" />
                    Confirmo o reembolso integral deste Pix. A ação fica registrada na auditoria.
                  </label>
                  <button
                    className="inline-flex min-h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700"
                    type="submit"
                  >
                    Registrar reembolso integral
                  </button>
                </form>
              ) : null}
              <FiscalDocumentUpload orderCode={detail.order.code} />
            </section>
          ) : null}
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Package aria-hidden="true" className="text-accent" size={22} />
          <div>
            <h2 className="text-lg font-black">Itens e personalização</h2>
            <p className="mt-1 text-sm text-slate-600">
              Confira exatamente o que será produzido antes de liberar o pedido.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {detail.items.map((item) => (
            <article className="rounded-xl border border-slate-200 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black">{item.productName}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.sku ?? "Sem SKU"}, {item.quantityLabel}
                  </p>
                </div>
                <strong>{item.totalLabel}</strong>
              </div>
              {item.customization.length ? (
                <dl className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                  {item.customization.map((field) => (
                    <div className="flex justify-between gap-4" key={`${item.id}-${field.label}`}>
                      <dt className="text-slate-500">{field.label}</dt>
                      <dd className="text-right font-bold">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Sem campos adicionais.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">
                  Personalização: {item.artworkStatusLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">
                  Produção: {item.productionStatusLabel}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {["OPERATOR", "ADMIN"].includes(session.role) ? (
        <WorkflowActions detail={detail} />
      ) : null}

      {detail.canViewArtwork ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <FileImage aria-hidden="true" className="text-accent" size={22} />
            <h2 className="text-lg font-black">Versões da arte</h2>
          </div>
          {detail.artworkVersions.length ? (
            <ul className="mt-4 divide-y divide-slate-200">
              {detail.artworkVersions.map((version) => (
                <li
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                  key={version.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{version.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {version.versionLabel}, {version.statusLabel}
                    </p>
                  </div>
                  <Link className={secondaryButtonClasses} href={version.href}>
                    Abrir revisão
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <StatePanel compact state="empty" title="Nenhuma arte enviada" />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd><StatusBadge>{value}</StatusBadge></dd>
    </div>
  );
}

type WorkflowDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetail>>>;

function WorkflowActions({ detail }: { detail: WorkflowDetail }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-black">Ações operacionais</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Cada mudança registra o usuário, o estado anterior e o novo estado na auditoria.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {detail.hasStructuredPersonalizationPending &&
        detail.paymentStatus === "PAID" ? (
          <WorkflowButton
            command="APPROVE_PERSONALIZATION"
            label="Aprovar personalização"
            orderId={detail.order.id}
          />
        ) : null}
        {detail.productionStatus === "BLOCKED" &&
        detail.paymentStatus === "PAID" &&
        detail.artworkStatus === "APPROVED" ? (
          <form
            action={updateOrderWorkflowAction}
            className="flex w-full flex-col gap-3 rounded-xl border p-4 sm:w-auto"
          >
            <input name="orderId" type="hidden" value={detail.order.id} />
            <input name="command" type="hidden" value="QUEUE" />
            {detail.isDtfOrder &&
            detail.quantityMeters > detail.customLeadTimeAboveMeters ? (
              <label className="text-sm font-bold">
                Prazo combinado acima de {detail.customLeadTimeAboveMeters} metros
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 font-normal"
                  name="manualLeadTimeNote"
                  required
                />
              </label>
            ) : null}
            <button className={secondaryButtonClasses} type="submit">
              Colocar na fila
            </button>
          </form>
        ) : null}
        {detail.productionStatus === "QUEUED" ? (
          <WorkflowButton command="START" label="Iniciar produção" orderId={detail.order.id} />
        ) : null}
        {detail.productionStatus === "IN_PRODUCTION" ? (
          <WorkflowButton command="READY" label="Marcar como pronto" orderId={detail.order.id} />
        ) : null}
        {detail.productionStatus === "READY" && detail.fulfillmentMethod === "PICKUP" ? (
          <WorkflowButton command="PICKED_UP" label="Confirmar retirada" orderId={detail.order.id} />
        ) : null}
        {detail.productionStatus === "READY" && detail.fulfillmentMethod === "SHIPPING" ? (
          <WorkflowButton command="SHIPPED" label="Marcar como enviado" orderId={detail.order.id} />
        ) : null}
        {detail.fulfillmentStatus === "SHIPPED" ? (
          <WorkflowButton command="DELIVERED" label="Confirmar entrega" orderId={detail.order.id} />
        ) : null}
        {!['COMPLETED', 'CANCELLED'].includes(detail.productionStatus) &&
        detail.paymentStatus !== "PAID" ? (
          <WorkflowButton command="CANCEL" danger label="Cancelar operação" orderId={detail.order.id} />
        ) : null}
      </div>
    </section>
  );
}

function WorkflowButton({
  orderId,
  command,
  label,
  danger = false,
}: {
  orderId: string;
  command: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updateOrderWorkflowAction}>
      <input name="orderId" type="hidden" value={orderId} />
      <input name="command" type="hidden" value={command} />
      <button
        className={
          danger
            ? "inline-flex min-h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700"
            : secondaryButtonClasses
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
