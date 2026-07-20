import { ArrowSquareOut, CheckCircle, Package, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { validateStandardProductForPublication, type Category, type StandardProductAggregate } from "@/domain";
import { dangerButtonClasses, primaryButtonClasses, secondaryButtonClasses, StatusBadge } from "./operations-ui";
import { StandardProductEditForm } from "./standard-product-edit-form";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function StandardProductAdmin({
  aggregate,
  publishAction,
  inventoryAction,
  priceAction,
  updateAction,
  archiveAction,
  categories,
  error,
  success,
}: {
  aggregate: StandardProductAggregate;
  publishAction: (data: FormData) => void | Promise<void>;
  inventoryAction: (data: FormData) => void | Promise<void>;
  priceAction: (data: FormData) => void | Promise<void>;
  updateAction: (data: FormData) => void | Promise<void>;
  archiveAction: (data: FormData) => void | Promise<void>;
  categories: Category[];
  error?: string;
  success?: string;
}) {
  const { product, configuration } = aggregate;
  const publication = validateStandardProductForPublication(aggregate);
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-3"><StatusBadge tone={product.status === "PUBLISHED" ? "success" : product.status === "ARCHIVED" ? "neutral" : "warning"}>{product.status === "PUBLISHED" ? "Publicado" : product.status === "ARCHIVED" ? "Arquivado" : "Rascunho"}</StatusBadge><span className="font-mono text-xs text-slate-500">{product.code}</span></div><h2 className="mt-3 text-3xl font-black tracking-tight">{product.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{product.summary}</p></div>
        {product.status !== "ARCHIVED" ? <Link href={product.slug} target="_blank" className={secondaryButtonClasses}>Pré-visualizar <ArrowSquareOut aria-hidden size={18} /></Link> : null}
      </header>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{success}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Categoria</p><p className="mt-2 font-black">{aggregate.categories[0]?.name ?? "Sem categoria"}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Variantes</p><p className="mt-2 text-2xl font-black">{aggregate.variants.length}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Personalização</p><p className="mt-2 font-black">{configuration.personalizationMode === "NONE" ? "Não" : "Sim"}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Prazo</p><p className="mt-2 font-black">{configuration.leadTimeBusinessDays} dias úteis</p></div>
      </section>

      <nav aria-label="Seções do produto" className="flex gap-2 overflow-x-auto rounded-card border border-border bg-white p-2 shadow-premium">
        {[{ href: "#cadastro", label: "Cadastro" }, { href: "#midia", label: "Mídia e SEO" }, { href: "#variantes", label: "Variantes" }, { href: "#personalizacao", label: "Personalização" }, { href: "#estoque", label: "Estoque" }, { href: "#precos", label: "Preços" }, { href: "#publicacao", label: "Publicação" }].map((item) => <a key={item.href} href={item.href} className="shrink-0 rounded-control px-3 py-2 text-sm font-bold text-muted transition hover:bg-surface-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{item.label}</a>)}
      </nav>

      {product.status === "ARCHIVED" ? <section className="rounded-card border border-border bg-surface-strong p-6"><h3 className="font-black text-foreground">Produto arquivado</h3><p className="mt-2 text-sm leading-6 text-muted">O cadastro permanece disponível para histórico, mas não aceita edição nem novas compras.</p></section> : <StandardProductEditForm aggregate={aggregate} categories={categories} action={updateAction} />}

      <section className="overflow-hidden rounded-2xl border bg-white" id="estoque">
        <div className="p-6"><h3 className="text-lg font-black">Variantes e estoque</h3><p className="mt-1 text-sm text-slate-600">Preço, dimensões e saldo usados no catálogo e no checkout.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-4">SKU</th><th className="p-4">Opções</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4">Envio</th><th className="p-4">Ajuste</th></tr></thead><tbody className="divide-y">{aggregate.variants.map((variant) => <tr key={variant.id}><td className="p-4 font-mono text-xs font-bold">{variant.sku}</td><td className="p-4">{Object.values(variant.optionValues).join(", ") || "Padrão"}</td><td className="p-4 font-bold">{money.format(variant.basePriceCents / 100)}</td><td className="p-4">{variant.stockMode === "MADE_TO_ORDER" ? "Sob encomenda" : `${variant.availableQuantity ?? 0} disponíveis, ${variant.reservedQuantity} reservados`}</td><td className="p-4">{variant.weightGrams} g, {variant.widthCm} x {variant.heightCm} x {variant.lengthCm} cm</td><td className="p-4">{variant.stockMode === "TRACKED" ? <form action={inventoryAction} className="flex gap-2"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="variantId" value={variant.id} /><input aria-label="Alteração de estoque" required name="delta" type="number" className="min-h-10 w-20 rounded-lg border px-2" placeholder="+10" /><input aria-label="Motivo" required name="reason" className="min-h-10 w-36 rounded-lg border px-2" placeholder="Entrada" /><button className="min-h-10 rounded-lg bg-slate-900 px-3 font-bold text-white">Salvar</button></form> : <span className="text-slate-500">Não aplicável</span>}</td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-black">Histórico de movimentações</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">Entradas, reservas, liberações e baixas preservadas por variante.</p>
        {aggregate.inventoryMovements.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Data</th><th className="p-3">SKU</th><th className="p-3">Movimento</th><th className="p-3">Quantidade</th><th className="p-3">Motivo</th></tr></thead><tbody className="divide-y">{aggregate.inventoryMovements.map((movement) => <tr key={movement.id}><td className="p-3 text-slate-600">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(movement.createdAt))}</td><td className="p-3 font-mono text-xs font-bold">{movement.variantSku}</td><td className="p-3"><StatusBadge tone={movement.type === "RELEASE" ? "warning" : movement.quantity < 0 ? "danger" : "success"}>{({ INITIAL: "Saldo inicial", ADJUSTMENT: "Ajuste", RESERVATION: "Reserva", RELEASE: "Liberação", COMMITMENT: "Baixa" } as const)[movement.type]}</StatusBadge></td><td className={`p-3 font-black ${movement.quantity > 0 ? "text-emerald-700" : "text-rose-700"}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td><td className="p-3 text-slate-600">{movement.reason}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-xl border border-dashed p-5 text-sm text-slate-500">Ainda não há movimentações de estoque para este produto.</p>}
      </section>

      <section className="rounded-2xl border bg-white p-6" id="precos">
        <h3 className="text-lg font-black">Tabelas de preço versionadas</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">Uma publicação cria uma nova versão. Pedidos anteriores preservam o preço contratado.</p>
        <div className="mt-6 grid gap-5">
          {aggregate.variants.map((variant) => {
            const current = aggregate.priceTables
              .filter((table) => table.variantId === variant.id && table.status === "PUBLISHED")
              .sort((first, second) => second.version - first.version)[0];
            const rows = Array.from({ length: 4 }, (_, index) => current?.tiers[index] ?? null);
            return (
              <form key={variant.id} action={priceAction} className="rounded-xl border p-5">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="variantId" value={variant.id} />
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs font-bold text-slate-500">{variant.sku}</p><p className="mt-1 font-black">Versão atual {current?.version ?? 1}</p></div><label className="grid gap-1 text-xs font-bold text-slate-600">Vigência opcional<input type="datetime-local" name="validFrom" className="min-h-10 rounded-lg border px-3 font-normal" /></label></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {rows.map((tier, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                      <label className="grid gap-1 text-xs font-bold">A partir de<input name={`tiers[${index}][minimum]`} type="number" min="1" required={index === 0} defaultValue={tier?.minimumQuantity ?? ""} className="min-h-10 rounded-lg border bg-white px-2 font-normal" /></label>
                      <label className="grid gap-1 text-xs font-bold">R$ por un.<input name={`tiers[${index}][price]`} inputMode="decimal" required={index === 0} defaultValue={tier ? (tier.unitPriceCents / 100).toFixed(2) : ""} className="min-h-10 rounded-lg border bg-white px-2 font-normal" /></label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end"><button className={secondaryButtonClasses}>Publicar nova versão</button></div>
              </form>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6" id="publicacao">
        <div className="flex items-start gap-3">{product.status === "PUBLISHED" ? <CheckCircle aria-hidden size={24} weight="fill" className="text-emerald-600" /> : <WarningCircle aria-hidden size={24} weight="fill" className="text-amber-600" />}<div><h3 className="font-black">Publicação</h3><p className="mt-1 text-sm leading-6 text-slate-600">Imagem, SEO, categoria, variante, preço, peso e dimensões são validados antes da publicação.</p></div></div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">{publication.checks.map((check) => <li key={check.code} className={`flex items-start gap-3 rounded-xl border p-4 ${check.complete ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>{check.complete ? <CheckCircle aria-hidden size={20} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" /> : <WarningCircle aria-hidden size={20} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />}<div><p className="text-sm font-black">{check.label}</p>{!check.complete ? <p className="mt-1 text-xs leading-5 text-slate-600">{check.message}</p> : null}</div></li>)}</ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{product.status === "DRAFT" ? <form action={publishAction}><input type="hidden" name="productId" value={product.id} /><button disabled={!publication.canPublish} className={primaryButtonClasses}><Package aria-hidden size={18} />Publicar no catálogo</button></form> : product.status === "PUBLISHED" ? <p className="text-sm font-bold text-emerald-700">Produto publicado. Alterações salvas passam a valer no catálogo sem modificar pedidos anteriores.</p> : <p className="text-sm font-bold text-muted">Produto preservado somente para consulta histórica.</p>}{product.status !== "ARCHIVED" ? <form action={archiveAction}><input type="hidden" name="productId" value={product.id} /><button className={dangerButtonClasses}>Arquivar produto</button></form> : null}</div>
      </section>
    </div>
  );
}
