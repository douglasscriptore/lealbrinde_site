import {
  ArrowSquareOut,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  Star,
} from "@phosphor-icons/react/dist/ssr";

import {
  primaryButtonClasses,
  secondaryButtonClasses,
  StatePanel,
  StatusBadge,
} from "./operations-ui";
import type {
  LoadState,
  OperationsProduct,
  ProductStatus,
  SemanticTone,
} from "./types";

export type ProductListProps = {
  products: OperationsProduct[];
  state?: LoadState;
  createHref: string;
  searchAction?: string;
  query?: string;
  errorMessage?: string;
};

const statusLabels: Record<ProductStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

const statusTones: Record<ProductStatus, SemanticTone> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <StatusBadge tone={statusTones[status]}>{statusLabels[status]}</StatusBadge>;
}

export function ProductList({
  products,
  state = "ready",
  createHref,
  searchAction = "/admin/produtos",
  query,
  errorMessage,
}: ProductListProps) {
  return (
    <section aria-labelledby="products-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight" id="products-title">
            Produtos
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Cadastre produtos, publique novas tabelas de preço e preserve o histórico.
          </p>
        </div>
        <a className={primaryButtonClasses} href={createHref}>
          <Plus aria-hidden="true" size={18} weight="bold" />
          Novo produto
        </a>
      </div>

      <form action={searchAction} className="max-w-xl" method="get" role="search">
        <label className="sr-only" htmlFor="product-search">
          Buscar por produto, código ou slug
        </label>
        <div className="flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <MagnifyingGlass
            aria-hidden="true"
            className="ml-3.5 shrink-0 text-slate-500"
            size={19}
          />
          <input
            className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-500"
            defaultValue={query}
            id="product-search"
            name="q"
            placeholder="Buscar produtos"
            type="search"
          />
          <button
            className="mr-1 min-h-9 shrink-0 rounded-lg px-3 text-sm font-bold text-accent-strong transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            type="submit"
          >
            Buscar
          </button>
        </div>
      </form>

      {state === "loading" ? <StatePanel state="loading" /> : null}
      {state === "error" ? (
        <StatePanel description={errorMessage} state="error" />
      ) : null}
      {state === "empty" || (state === "ready" && products.length === 0) ? (
        <StatePanel
          action={
            <a className={primaryButtonClasses} href={createHref}>
              <Plus aria-hidden="true" size={18} weight="bold" />
              Cadastrar produto
            </a>
          }
          description={
            query
              ? "Nenhum produto corresponde à busca. Limpe o termo e tente novamente."
              : "Cadastre o primeiro produto para preparar preços, conteúdo e publicação."
          }
          state="empty"
          title={query ? "Nenhum resultado" : "Nenhum produto cadastrado"}
        />
      ) : null}

      {state === "ready" && products.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {products.map((product) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5"
                key={product.id}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Package aria-hidden="true" size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="min-w-0 flex-1 font-bold text-slate-950">
                        {product.name}
                      </h3>
                      {product.featured ? (
                        <Star
                          aria-label="Produto destacado"
                          className="shrink-0 text-amber-500"
                          size={18}
                          weight="fill"
                        />
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {product.code}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-slate-200 py-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Estado</dt>
                    <dd className="mt-1">
                      <ProductStatusBadge status={product.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Preço</dt>
                    <dd className="mt-1 font-semibold">{product.priceSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Tipo</dt>
                    <dd className="mt-1 font-semibold">{product.typeLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Atualizado</dt>
                    <dd className="mt-1 font-semibold">{product.updatedAtLabel}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <a className={`${secondaryButtonClasses} flex-1`} href={product.editHref}>
                    <PencilSimple aria-hidden="true" size={18} />
                    Editar
                  </a>
                  {product.previewHref ? (
                    <a
                      aria-label={`Pré-visualizar ${product.name}`}
                      className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={product.previewHref}
                    >
                      <ArrowSquareOut aria-hidden="true" size={19} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <caption className="sr-only">Lista de produtos cadastrados</caption>
                <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3" scope="col">Produto</th>
                    <th className="px-5 py-3" scope="col">Tipo</th>
                    <th className="px-5 py-3" scope="col">Estado</th>
                    <th className="px-5 py-3" scope="col">Preço</th>
                    <th className="px-5 py-3" scope="col">Atualizado</th>
                    <th className="px-5 py-3 text-right" scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr className="hover:bg-slate-50" key={product.id}>
                      <th className="px-5 py-4 font-normal" scope="row">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                            <Package aria-hidden="true" size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-bold text-slate-950">
                              <span className="truncate">{product.name}</span>
                              {product.featured ? (
                                <Star
                                  aria-label="Produto destacado"
                                  className="shrink-0 text-amber-500"
                                  size={16}
                                  weight="fill"
                                />
                              ) : null}
                            </span>
                            <span className="block font-mono text-xs text-slate-500">
                              {product.code}, {product.slug}
                            </span>
                          </span>
                        </div>
                      </th>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {product.typeLabel}
                      </td>
                      <td className="px-5 py-4">
                        <ProductStatusBadge status={product.status} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {product.priceSummary}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {product.updatedAtLabel}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {product.previewHref ? (
                            <a
                              aria-label={`Pré-visualizar ${product.name}`}
                              className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              href={product.previewHref}
                            >
                              <ArrowSquareOut aria-hidden="true" size={18} />
                            </a>
                          ) : null}
                          <a className={`${secondaryButtonClasses} min-h-10 px-3 py-2`} href={product.editHref}>
                            <PencilSimple aria-hidden="true" size={17} />
                            Editar
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
