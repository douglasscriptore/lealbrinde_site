import type { Metadata } from "next";
import Link from "next/link";

import { primaryButtonClasses, secondaryButtonClasses } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";

import { createDtfProductFromTemplateAction } from "../../actions";

export const metadata: Metadata = { title: "Novo produto DTF" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireStaff(["ADMIN"]);
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#007FA8]">Catálogo DTF</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Cadastrar produto</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          O novo rascunho recebe cópias independentes das políticas, especificações e preços do produto modelo. Depois, cada seção pode ser revisada sem alterar pedidos ou produtos existentes.
        </p>
      </header>

      <form action={createDtfProductFromTemplateAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="text-sm font-bold" htmlFor="new-product-name">Nome</label>
          <input className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 dark:bg-slate-950" id="new-product-name" name="name" placeholder="DTF Especial por Metro" required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold" htmlFor="new-product-code">Código interno</label>
            <input autoCapitalize="characters" className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-mono uppercase dark:bg-slate-950" id="new-product-code" name="code" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,63}" placeholder="DTF-ESPECIAL" required />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="new-product-slug">Slug</label>
            <input className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-mono dark:bg-slate-950" id="new-product-slug" name="slug" pattern="/[a-z0-9]+(?:[/-][a-z0-9]+)*" placeholder="/dtf/especial-por-metro" required />
          </div>
        </div>
        {erro ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">{erro.slice(0, 500)}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Link className={secondaryButtonClasses} href="/admin/produtos">Cancelar</Link>
          <button className={primaryButtonClasses} type="submit">Criar rascunho</button>
        </div>
      </form>
    </div>
  );
}
