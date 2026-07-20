import type { Metadata } from "next";
import Link from "next/link";

import { primaryButtonClasses, secondaryButtonClasses, StandardProductForm } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { CommerceRepository, openDatabase } from "@/server/db";

import { createDtfProductFromTemplateAction, createStandardProductAction } from "../../actions";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; tipo?: string }>;
}) {
  await requireStaff(["ADMIN"]);
  const { erro, tipo } = await searchParams;
  const db = openDatabase();
  const categories = new CommerceRepository(db).listCategories().filter((category) => category.status !== "ARCHIVED");
  db.close();

  if (tipo === "padrao") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold text-accent">Catálogo próprio</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Cadastrar produto padrão</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Configure opções, combinações, estoque, dimensões e personalização. O produto começa como rascunho.</p>
        </header>
        <StandardProductForm categories={categories} action={createStandardProductAction} error={erro?.slice(0, 500)} />
      </div>
    );
  }

  if (tipo !== "dtf") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <header><p className="text-sm font-bold text-accent">Novo cadastro</p><h2 className="mt-2 text-3xl font-black tracking-tight">Qual produto você quer criar?</h2></header>
        <div className="grid gap-5 md:grid-cols-2">
          <Link href="/admin/produtos/novo?tipo=padrao" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-accent hover:shadow-premium"><h3 className="text-xl font-black">Produto padrão</h3><p className="mt-3 text-sm leading-6 text-slate-600">Brindes com variações, estoque, preço por quantidade e personalização.</p><span className="mt-6 inline-flex font-bold text-accent">Configurar produto</span></Link>
          <Link href="/admin/produtos/novo?tipo=dtf" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-accent hover:shadow-premium"><h3 className="text-xl font-black">DTF por metro</h3><p className="mt-3 text-sm leading-6 text-slate-600">Duplica políticas, conteúdo e preços de um produto DTF existente.</p><span className="mt-6 inline-flex font-bold text-accent">Criar DTF</span></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-bold text-accent">Catálogo DTF</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Cadastrar produto</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          O novo rascunho recebe cópias independentes das políticas, especificações e preços do produto modelo. Depois, cada seção pode ser revisada sem alterar pedidos ou produtos existentes.
        </p>
      </header>

      <form action={createDtfProductFromTemplateAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <label className="text-sm font-bold" htmlFor="new-product-name">Nome</label>
          <input className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4" id="new-product-name" name="name" placeholder="DTF Especial por Metro" required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold" htmlFor="new-product-code">Código interno</label>
            <input autoCapitalize="characters" className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-mono uppercase" id="new-product-code" name="code" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,63}" placeholder="DTF-ESPECIAL" required />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="new-product-slug">Slug</label>
            <input className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-mono" id="new-product-slug" name="slug" pattern="/[a-z0-9]+(?:[/-][a-z0-9]+)*" placeholder="/dtf/especial-por-metro" required />
          </div>
        </div>
        {erro ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">{erro.slice(0, 500)}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Link className={secondaryButtonClasses} href="/admin/produtos">Cancelar</Link>
          <button className={primaryButtonClasses} type="submit">Criar rascunho</button>
        </div>
      </form>
    </div>
  );
}
