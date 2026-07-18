import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArtworkResubmission } from "@/components/account/artwork-resubmission";
import { requireSession } from "@/server/auth/session";
import { getCustomerArtworkResubmission } from "@/server/queries/customer-orders";

export const metadata: Metadata = {
  title: "Enviar arquivo corrigido",
};

export default async function CustomerArtworkResubmissionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await requireSession();
  const { code } = await params;
  const data = getCustomerArtworkResubmission(code, session.user.email);

  if (!data) notFound();
  if (!data.eligible) redirect(`/minha-conta/pedidos/${encodeURIComponent(data.orderCode)}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="inline-flex min-h-11 items-center rounded-xl text-sm font-bold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:text-slate-300"
        href={`/minha-conta/pedidos/${data.orderCode}`}
      >
        Voltar ao pedido
      </Link>

      <header className="mt-5">
        <p className="font-mono text-sm font-black text-[#006E91] dark:text-[#72D9F7]">
          {data.orderCode}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          Enviar arquivo corrigido
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Envie uma nova versão para {data.productName}. A versão anterior continuará preservada no histórico.
        </p>
      </header>

      {data.correctionNote ? (
        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
          <h2 className="font-black text-amber-950 dark:text-amber-50">
            Orientação da produção
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900 dark:text-amber-100">
            {data.correctionNote}
          </p>
          {data.correctionReferenceUrl ? (
            <a
              className="mt-4 inline-flex min-h-11 items-center font-bold text-amber-950 underline underline-offset-4 dark:text-amber-50"
              href={data.correctionReferenceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir arquivo de referência
            </a>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <h2 className="text-lg font-black">Nova versão</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Confira a orientação acima e selecione o arquivo pronto para impressão.
        </p>
        <ArtworkResubmission
          acceptedExtensions={data.acceptedExtensions}
          maximumFileSizeMb={data.maximumFileSizeMb}
          orderCode={data.orderCode}
        />
      </section>
    </div>
  );
}
