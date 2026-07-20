"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import type { Category, PersonalizationFieldType, StockMode } from "@/domain";
import { primaryButtonClasses, secondaryButtonClasses } from "./operations-ui";
import { MediaUpload } from "./standard-product-edit-form";

type OptionDraft = { id: string; name: string; values: string };
type FieldDraft = { id: string; key: string; label: string; type: PersonalizationFieldType; required: boolean; options: string; price: string };

function combinations(options: Array<{ name: string; values: string[] }>): Array<Record<string, string>> {
  return options.reduce<Array<Record<string, string>>>((rows, option) =>
    rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name]: value }))), [{}]);
}

export function StandardProductForm({
  categories,
  action,
  error,
}: {
  categories: Category[];
  action: (data: FormData) => void | Promise<void>;
  error?: string;
}) {
  const [code, setCode] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([
    { id: crypto.randomUUID(), name: "Cor", values: "" },
    { id: crypto.randomUUID(), name: "Tamanho", values: "" },
    { id: crypto.randomUUID(), name: "Material", values: "" },
  ]);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const variants = useMemo(() => combinations(
    options
      .map((option) => ({ name: option.name.trim(), values: option.values.split(",").map((value) => value.trim()).filter(Boolean) }))
      .filter((option) => option.name && option.values.length),
  ), [options]);

  return (
    <form action={action} className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Dados básicos</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Nome<input required name="name" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Código interno<input required name="code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} pattern="[A-Z0-9][A-Z0-9_-]{2,63}" className="min-h-12 rounded-xl border px-4 font-mono font-normal uppercase" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">URL pública<div className="flex min-h-12 items-center rounded-xl border bg-white"><span className="pl-4 text-sm text-slate-500">/produtos/</span><input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="min-w-0 flex-1 bg-transparent px-2 font-mono font-normal outline-none" /></div></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Resumo<input required name="summary" maxLength={240} className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Descrição<textarea required name="description" rows={5} className="rounded-xl border p-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Categoria<select required name="categoryId" className="min-h-12 rounded-xl border bg-white px-4 font-normal"><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Prazo produtivo<input required name="leadTimeBusinessDays" type="number" min="0" defaultValue="3" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Quantidade mínima<input required name="minimumQuantity" type="number" min="1" defaultValue="1" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Incremento<input required name="quantityIncrement" type="number" min="1" defaultValue="1" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Mídia e SEO</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Imagem principal<input name="mainImageUrl" value={mainImageUrl} onChange={(event) => setMainImageUrl(event.target.value)} placeholder="Pode ser adicionada antes da publicação" className="min-h-12 rounded-xl border px-4 font-normal" /><span className="text-xs font-normal text-slate-500">Opcional no rascunho e obrigatória para publicar.</span></label>
          <div className="sm:col-span-2"><MediaUpload label="Enviar imagem principal" onUploaded={setMainImageUrl} /></div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Texto alternativo<input name="mainImageAlt" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Título SEO<input required name="seoTitle" maxLength={70} className="min-h-12 rounded-xl border px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-bold">Descrição SEO<input required name="seoDescription" maxLength={170} className="min-h-12 rounded-xl border px-4 font-normal" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Opções e variantes</h3>
        <p className="mt-2 text-sm text-slate-600">Separe os valores por vírgula. A matriz de combinações é criada automaticamente.</p>
        <div className="mt-5 space-y-3">
          {options.map((option, index) => <div key={option.id} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]"><input aria-label={`Nome da opção ${index + 1}`} name={`options[${index}][name]`} value={option.name} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, name: event.target.value } : item))} className="min-h-11 rounded-xl border px-3" /><input aria-label={`Valores da opção ${option.name}`} name={`options[${index}][values]`} value={option.values} placeholder="Azul, Branco, Preto" onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, values: event.target.value } : item))} className="min-h-11 rounded-xl border px-3" /><button type="button" aria-label="Remover opção" onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))} className="grid size-11 place-items-center rounded-xl border text-slate-600"><Minus aria-hidden size={17} /></button></div>)}
        </div>
        <button type="button" onClick={() => setOptions((current) => [...current, { id: crypto.randomUUID(), name: "", values: "" }])} className={`${secondaryButtonClasses} mt-4`}><Plus aria-hidden size={17} />Adicionar opção</button>

        <div className="mt-7 overflow-x-auto rounded-xl border">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Combinação</th><th className="p-3">SKU</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3">Quantidade</th><th className="p-3">Peso (g)</th><th className="p-3">L x A x C (cm)</th></tr></thead>
            <tbody className="divide-y">
              {variants.map((variant, index) => {
                const suffix = Object.values(variant).join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase();
                return <tr key={JSON.stringify(variant)}><td className="p-3 font-semibold">{Object.entries(variant).map(([name, value]) => `${name}: ${value}`).join(", ") || "Padrão"}<input type="hidden" name={`variants[${index}][options]`} value={JSON.stringify(variant)} /></td><td className="p-2"><input required name={`variants[${index}][sku]`} defaultValue={[code || "SKU", suffix].filter(Boolean).join("-")} className="min-h-10 w-36 rounded-lg border px-2 font-mono" /></td><td className="p-2"><input required name={`variants[${index}][price]`} inputMode="decimal" placeholder="29,90" className="min-h-10 w-24 rounded-lg border px-2" /></td><td className="p-2"><select name={`variants[${index}][stockMode]`} defaultValue={"MADE_TO_ORDER" satisfies StockMode} className="min-h-10 rounded-lg border bg-white px-2"><option value="MADE_TO_ORDER">Sob encomenda</option><option value="TRACKED">Controlado</option></select></td><td className="p-2"><input name={`variants[${index}][stock]`} type="number" min="0" defaultValue="0" className="min-h-10 w-20 rounded-lg border px-2" /></td><td className="p-2"><input name={`variants[${index}][weight]`} type="number" min="0" placeholder="Pendente" className="min-h-10 w-20 rounded-lg border px-2" /></td><td className="p-2"><div className="flex gap-1"><input aria-label="Largura" name={`variants[${index}][width]`} type="number" min="0" step="0.1" placeholder="0" className="min-h-10 w-16 rounded-lg border px-2" /><input aria-label="Altura" name={`variants[${index}][height]`} type="number" min="0" step="0.1" placeholder="0" className="min-h-10 w-16 rounded-lg border px-2" /><input aria-label="Comprimento" name={`variants[${index}][length]`} type="number" min="0" step="0.1" placeholder="0" className="min-h-10 w-16 rounded-lg border px-2" /></div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Personalização</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Modo<select name="personalizationMode" defaultValue="NONE" className="min-h-12 rounded-xl border bg-white px-4 font-normal"><option value="NONE">Sem personalização</option><option value="STRUCTURED_FIELDS">Campos estruturados</option><option value="ARTWORK_UPLOAD">Arquivo de arte</option></select></label>
          <label className="inline-flex items-center gap-3 self-end pb-3 text-sm font-bold"><input type="checkbox" name="reviewRequired" value="true" className="size-4 accent-accent" />Exigir revisão humana</label>
        </div>
        <div className="mt-5 space-y-3">{fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-[10rem_1fr_10rem_1fr_8rem_auto]"><input required name={`fields[${index}][key]`} value={field.key} placeholder="nome_gravacao" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, key: event.target.value } : item))} className="min-h-10 rounded-lg border px-2 font-mono text-sm" /><input required name={`fields[${index}][label]`} value={field.label} placeholder="Nome para gravação" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item))} className="min-h-10 rounded-lg border px-2" /><select name={`fields[${index}][type]`} value={field.type} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, type: event.target.value as PersonalizationFieldType } : item))} className="min-h-10 rounded-lg border bg-white px-2"><option value="TEXT">Texto</option><option value="LONG_TEXT">Texto longo</option><option value="SELECT">Seleção</option><option value="NUMBER">Número</option><option value="COLOR">Cor</option><option value="NOTE">Observação</option></select><input name={`fields[${index}][options]`} value={field.options} placeholder="Opções separadas por vírgula" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, options: event.target.value } : item))} className="min-h-10 rounded-lg border px-2" /><input name={`fields[${index}][price]`} value={field.price} placeholder="Acréscimo" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, price: event.target.value } : item))} className="min-h-10 rounded-lg border px-2" /><button type="button" aria-label="Remover campo" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))} className="grid size-10 place-items-center rounded-lg border"><Minus aria-hidden size={16} /></button><label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name={`fields[${index}][required]`} value="true" checked={field.required} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, required: event.target.checked } : item))} className="size-4 accent-accent" />Obrigatório</label></div>)}</div>
        <button type="button" onClick={() => setFields((current) => [...current, { id: crypto.randomUUID(), key: "", label: "", type: "TEXT", required: false, options: "", price: "0" }])} className={`${secondaryButtonClasses} mt-4`}><Plus aria-hidden size={17} />Adicionar campo</button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        {!categories.length ? <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Cadastre uma categoria antes de criar o produto.</p><p className="mt-1">Use o módulo Categorias e volte a este formulário quando ela estiver pronta.</p></div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><label className="inline-flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="pickupEnabled" value="true" defaultChecked className="size-4 accent-accent" />Retirada local</label><label className="inline-flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="shippingEnabled" value="true" defaultChecked className="size-4 accent-accent" />Entrega nacional</label></div>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
        <div className="mt-6 flex justify-end"><button disabled={!categories.length} className={primaryButtonClasses} type="submit">Criar produto em rascunho</button></div>
      </section>
    </form>
  );
}
