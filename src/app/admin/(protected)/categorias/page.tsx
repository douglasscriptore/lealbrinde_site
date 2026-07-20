import { ArrowUpRight, Tag } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import {
  primaryButtonClasses,
  secondaryButtonClasses,
  StatusBadge,
} from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { CommerceRepository, openDatabase } from "@/server/db";

import { createCategoryAction, publishCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  await requireStaff(["ADMIN"]);
  const feedback = await searchParams;
  const db = openDatabase();
  const categories = new CommerceRepository(db).listCategories();
  db.close();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-accent">Catálogo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Categorias</h2>
        <p className="mt-2 text-sm text-muted">Organize páginas públicas e filtros sem expor rascunhos.</p>
      </header>

      {feedback.erro ? (
        <p role="alert" className="rounded-control border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          {feedback.erro}
        </p>
      ) : null}
      {feedback.sucesso ? (
        <p role="status" className="rounded-control border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {feedback.sucesso}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section className="overflow-hidden rounded-card border border-border bg-white shadow-premium">
          <div className="flex items-center gap-3 border-b border-border p-5">
            <span className="grid size-10 place-items-center rounded-control bg-accent-soft text-accent-strong">
              <Tag aria-hidden size={20} weight="bold" />
            </span>
            <div>
              <h3 className="font-black text-foreground">Cadastradas</h3>
              <p className="mt-1 text-sm text-muted">Categorias em rascunho permanecem invisíveis no site.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {categories.map((category) => (
              <article key={category.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-bold text-foreground">{category.name}</h4>
                    <StatusBadge tone={category.status === "PUBLISHED" ? "success" : "warning"}>
                      {category.status === "PUBLISHED" ? "Publicada" : "Rascunho"}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted">/categorias/{category.slug}</p>
                </div>
                {category.status === "DRAFT" ? (
                  <form action={publishCategoryAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <button className={secondaryButtonClasses}>
                      Publicar categoria <ArrowUpRight aria-hidden size={17} />
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <form action={createCategoryAction} className="space-y-4 rounded-card border border-border bg-white p-5 shadow-premium lg:sticky lg:top-24">
          <h3 className="font-black text-foreground">Nova categoria</h3>
          <label className="grid gap-2 text-sm font-bold text-foreground">Nome<input required name="name" className="min-h-11 rounded-control border border-border px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold text-foreground">Slug<input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="min-h-11 rounded-control border border-border px-3 font-mono font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold text-foreground">Descrição<textarea required name="description" rows={3} className="rounded-control border border-border p-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold text-foreground">Imagem<input name="imageUrl" placeholder="/images/categoria.webp" className="min-h-11 rounded-control border border-border px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold text-foreground">Título SEO<input required name="seoTitle" className="min-h-11 rounded-control border border-border px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold text-foreground">Descrição SEO<input required name="seoDescription" className="min-h-11 rounded-control border border-border px-3 font-normal" /></label>
          <input type="hidden" name="displayOrder" value="10" />
          <label className="flex items-center gap-2 text-sm font-bold text-foreground"><input type="checkbox" name="published" value="true" className="size-4 accent-accent" />Publicar imediatamente</label>
          <button className={`${primaryButtonClasses} w-full`}>Cadastrar categoria</button>
        </form>
      </div>
    </div>
  );
}
