"use client";

import {
  Archive,
  Check,
  ImageSquare,
  Minus,
  Package,
  Plus,
  SlidersHorizontal,
  Truck,
  UploadSimple,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import type {
  Category,
  PersonalizationFieldType,
  PersonalizationMode,
  StandardProductAggregate,
  StockMode,
} from "@/domain";
import {
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from "./operations-ui";

type OptionDraft = { id: string; name: string; values: string };
type GalleryDraft = { id: string; url: string; alt: string };
type FieldDraft = {
  id: string;
  key: string;
  label: string;
  type: PersonalizationFieldType;
  required: boolean;
  options: string;
  maximumLength: string;
  price: string;
};
type VariantDraft = {
  key: string;
  id?: string;
  sku: string;
  optionValues: Record<string, string>;
  price: string;
  minimumQuantity: string;
  quantityIncrement: string;
  stockMode: StockMode;
  stock: string;
  weight: string;
  width: string;
  height: string;
  length: string;
  active: boolean;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function decimal(value: number): string {
  return String(value).replace(".", ",");
}

function optionValues(option: OptionDraft): string[] {
  return option.values.split(",").map((value) => value.trim()).filter(Boolean);
}

export function MediaUpload({
  label,
  onUploaded,
}: {
  label: string;
  onUploaded: (url: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setStatus("uploading");
    setMessage("Enviando imagem...");
    const data = new FormData();
    data.set("media", file);
    try {
      const response = await fetch("/api/admin/product-media", { method: "POST", body: data });
      const result = await response.json() as { media?: { url: string }; error?: string };
      if (!response.ok || !result.media) throw new Error(result.error ?? "Não foi possível enviar a imagem.");
      onUploaded(result.media.url);
      setStatus("success");
      setMessage("Imagem enviada e vinculada ao campo.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={`${secondaryButtonClasses} cursor-pointer`}>
        <UploadSimple aria-hidden size={17} />
        {status === "uploading" ? "Enviando..." : label}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="sr-only"
          disabled={status === "uploading"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </label>
      {message ? <p role={status === "error" ? "alert" : "status"} className={`text-xs font-semibold ${status === "error" ? "text-rose-700" : status === "success" ? "text-emerald-700" : "text-muted"}`}>{message}</p> : null}
    </div>
  );
}

export function StandardProductEditForm({
  aggregate,
  categories,
  action,
}: {
  aggregate: StandardProductAggregate;
  categories: Category[];
  action: (data: FormData) => void | Promise<void>;
}) {
  const { product, configuration } = aggregate;
  const [mainImageUrl, setMainImageUrl] = useState(product.mainImageUrl ?? "");
  const [mainImageAlt, setMainImageAlt] = useState(
    product.gallery.find((media) => media.url === product.mainImageUrl)?.alt ?? "",
  );
  const [gallery, setGallery] = useState<GalleryDraft[]>(
    product.gallery.filter((media) => media.url !== product.mainImageUrl).map((media) => ({
      id: media.id,
      url: media.url,
      alt: media.alt,
    })),
  );
  const [options, setOptions] = useState<OptionDraft[]>(aggregate.options.map((option) => ({
    id: option.id,
    name: option.name,
    values: option.values.map((value) => value.value).join(", "),
  })));
  const [variants, setVariants] = useState<VariantDraft[]>(aggregate.variants.map((variant) => ({
    key: variant.id,
    id: variant.id,
    sku: variant.sku,
    optionValues: variant.optionValues,
    price: (variant.basePriceCents / 100).toFixed(2).replace(".", ","),
    minimumQuantity: String(variant.minimumQuantity),
    quantityIncrement: String(variant.quantityIncrement),
    stockMode: variant.stockMode,
    stock: String(variant.availableQuantity ?? 0),
    weight: String(variant.weightGrams),
    width: decimal(variant.widthCm),
    height: decimal(variant.heightCm),
    length: decimal(variant.lengthCm),
    active: variant.active,
  })));
  const [personalizationMode, setPersonalizationMode] = useState<PersonalizationMode>(configuration.personalizationMode);
  const [fields, setFields] = useState<FieldDraft[]>(aggregate.personalizationFields.map((field) => ({
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options.join(", "),
    maximumLength: field.maximumLength ? String(field.maximumLength) : "",
    price: (field.priceAdjustmentCents / 100).toFixed(2).replace(".", ","),
  })));
  const slugPart = product.slug.replace(/^\/produtos\//, "");
  const activeCount = variants.filter((variant) => variant.active).length;
  const configuredOptions = useMemo(() => options.filter((option) => option.name.trim() && optionValues(option).length), [options]);

  function renameOption(optionId: string, name: string) {
    const previous = options.find((option) => option.id === optionId)?.name ?? "";
    setOptions((current) => current.map((option) => option.id === optionId ? { ...option, name } : option));
    setVariants((current) => current.map((variant) => {
      if (!previous || previous === name || !(previous in variant.optionValues)) return variant;
      const next = { ...variant.optionValues, [name]: variant.optionValues[previous] };
      delete next[previous];
      return { ...variant, optionValues: next };
    }));
  }

  function addVariant() {
    const values = Object.fromEntries(configuredOptions.map((option) => [option.name, optionValues(option)[0] ?? ""]));
    setVariants((current) => [...current, {
      key: crypto.randomUUID(),
      sku: `${product.code}-NOVA`,
      optionValues: values,
      price: "",
      minimumQuantity: String(configuration.minimumQuantity),
      quantityIncrement: String(configuration.quantityIncrement),
      stockMode: "MADE_TO_ORDER",
      stock: "0",
      weight: "",
      width: "",
      height: "",
      length: "",
      active: true,
    }]);
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="productId" value={product.id} />

      <section className="rounded-card border border-border bg-white p-5 shadow-premium sm:p-6" id="cadastro">
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong"><SlidersHorizontal aria-hidden size={20} weight="bold" /></span>
          <div><h3 className="text-lg font-black text-foreground">Cadastro comercial</h3><p className="mt-1 text-sm leading-6 text-muted">Conteúdo público, categoria, prazo e posição no catálogo.</p></div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={`grid gap-2 ${labelClasses}`}>Nome<input required name="name" defaultValue={product.name} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Código interno<input readOnly value={product.code} className={`${inputClasses} font-mono uppercase`} /><span className="text-xs font-normal text-muted">O código permanece fixo para preservar integrações.</span></label>
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>URL pública<div className="flex min-h-11 items-center rounded-control border border-border bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"><span className="pl-3.5 text-sm font-normal text-muted">/produtos/</span><input required name="slug" defaultValue={slugPart} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 font-mono text-sm font-normal outline-none" /></div></label>
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>Resumo<input required name="summary" defaultValue={product.summary} maxLength={240} className={inputClasses} /></label>
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>Descrição<textarea required name="description" defaultValue={product.description} rows={6} className={`${inputClasses} resize-y`} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Categoria principal<select required name="categoryId" defaultValue={aggregate.categories[0]?.id ?? ""} className={inputClasses}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={`grid gap-2 ${labelClasses}`}>Prazo produtivo em dias úteis<input required name="leadTimeBusinessDays" type="number" min="0" defaultValue={configuration.leadTimeBusinessDays} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Quantidade mínima<input required name="minimumQuantity" type="number" min="1" defaultValue={configuration.minimumQuantity} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Incremento<input required name="quantityIncrement" type="number" min="1" defaultValue={configuration.quantityIncrement} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Ordem no catálogo<input required name="displayOrder" type="number" min="0" defaultValue={product.displayOrder} className={inputClasses} /></label>
          <label className="inline-flex min-h-11 items-center gap-3 self-end text-sm font-semibold text-foreground"><input type="checkbox" name="featured" value="true" defaultChecked={product.featured} className="size-4 accent-accent" />Destacar no catálogo e na home</label>
        </div>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-premium sm:p-6" id="midia">
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong"><ImageSquare aria-hidden size={20} weight="bold" /></span>
          <div><h3 className="text-lg font-black text-foreground">Mídia e SEO</h3><p className="mt-1 text-sm leading-6 text-muted">Use arquivos públicos em <code>/images/</code> ou URLs HTTPS autorizadas.</p></div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>Imagem principal<input name="mainImageUrl" value={mainImageUrl} onChange={(event) => setMainImageUrl(event.target.value)} placeholder="Pode ser adicionada antes da publicação" className={inputClasses} /><span className="text-xs font-normal text-muted">Opcional no rascunho e obrigatória para publicar.</span></label>
          <div className="sm:col-span-2"><MediaUpload label="Enviar imagem principal" onUploaded={setMainImageUrl} /></div>
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>Descrição acessível da imagem<input name="mainImageAlt" value={mainImageAlt} onChange={(event) => setMainImageAlt(event.target.value)} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Título SEO<input required name="seoTitle" defaultValue={product.seo.title} maxLength={70} className={inputClasses} /></label>
          <label className={`grid gap-2 ${labelClasses}`}>Imagem social<input name="socialImageUrl" defaultValue={product.seo.socialImageUrl ?? ""} className={inputClasses} /></label>
          <label className={`grid gap-2 sm:col-span-2 ${labelClasses}`}>Descrição SEO<textarea required name="seoDescription" defaultValue={product.seo.description} maxLength={170} rows={3} className={`${inputClasses} resize-y`} /></label>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-foreground">Galeria complementar</h4><p className="mt-1 text-sm text-muted">A ordem abaixo será usada na página do produto.</p></div><div className="flex flex-wrap gap-2"><MediaUpload label="Enviar para galeria" onUploaded={(url) => setGallery((current) => [...current, { id: crypto.randomUUID(), url, alt: "" }])} /><button type="button" onClick={() => setGallery((current) => [...current, { id: crypto.randomUUID(), url: "", alt: "" }])} className={secondaryButtonClasses}><Plus aria-hidden size={17} />Adicionar por URL</button></div></div>
          <div className="mt-4 space-y-3">{gallery.length ? gallery.map((media, index) => <div key={media.id} className="grid gap-3 rounded-control bg-surface-strong/60 p-3 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name={`gallery[${index}][id]`} value={media.id} /><label className="grid gap-1 text-xs font-bold text-muted">URL<input required name={`gallery[${index}][url]`} value={media.url} onChange={(event) => setGallery((current) => current.map((item) => item.id === media.id ? { ...item, url: event.target.value } : item))} className={inputClasses} /></label><label className="grid gap-1 text-xs font-bold text-muted">Texto alternativo<input required name={`gallery[${index}][alt]`} value={media.alt} onChange={(event) => setGallery((current) => current.map((item) => item.id === media.id ? { ...item, alt: event.target.value } : item))} className={inputClasses} /></label><button type="button" aria-label="Remover imagem" onClick={() => setGallery((current) => current.filter((item) => item.id !== media.id))} className="grid size-11 self-end place-items-center rounded-control border border-border bg-white text-muted hover:border-rose-300 hover:text-rose-700"><Minus aria-hidden size={17} /></button></div>) : <p className="rounded-control border border-dashed border-border p-5 text-sm text-muted">Nenhuma imagem complementar. A imagem principal continuará sendo exibida.</p>}</div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-premium sm:p-6" id="variantes">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong"><Package aria-hidden size={20} weight="bold" /></span><div><h3 className="text-lg font-black text-foreground">Opções e variantes</h3><p className="mt-1 text-sm leading-6 text-muted">{activeCount} variante{activeCount === 1 ? "" : "s"} ativa{activeCount === 1 ? "" : "s"}. Preços existentes continuam na área de versionamento.</p></div></div>
          <button type="button" onClick={addVariant} className={secondaryButtonClasses}><Plus aria-hidden size={17} />Nova variante</button>
        </div>
        <div className="mt-5 space-y-3">
          {options.map((option, index) => <div key={option.id} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]"><input aria-label={`Nome da opção ${index + 1}`} name={`options[${index}][name]`} value={option.name} onChange={(event) => renameOption(option.id, event.target.value)} className={inputClasses} /><input aria-label={`Valores da opção ${option.name}`} name={`options[${index}][values]`} value={option.values} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, values: event.target.value } : item))} placeholder="Azul, Branco, Preto" className={inputClasses} /><button type="button" aria-label="Remover opção" onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))} className="grid size-11 place-items-center rounded-control border border-border text-muted hover:border-rose-300 hover:text-rose-700"><Minus aria-hidden size={17} /></button></div>)}
          <button type="button" onClick={() => setOptions((current) => [...current, { id: crypto.randomUUID(), name: "", values: "" }])} className={secondaryButtonClasses}><Plus aria-hidden size={17} />Adicionar opção</button>
        </div>
        <div className="mt-6 space-y-4">
          {variants.map((variant, index) => (
            <article key={variant.key} className={`rounded-card border p-4 ${variant.active ? "border-border bg-white" : "border-dashed border-border bg-surface-strong/45"}`}>
              {variant.id ? <input type="hidden" name={`variants[${index}][id]`} value={variant.id} /> : null}
              <input type="hidden" name={`variants[${index}][options]`} value={JSON.stringify(variant.optionValues)} />
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs font-bold text-muted">{variant.id ? "VARIANTE EXISTENTE" : "NOVA VARIANTE"}</p><p className="mt-1 font-black text-foreground">{variant.sku || "SKU pendente"}</p></div><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 text-sm font-bold"><input type="checkbox" name={`variants[${index}][active]`} value="true" checked={variant.active} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, active: event.target.checked } : item))} className="size-4 accent-accent" />Ativa</label>{!variant.id ? <button type="button" onClick={() => setVariants((current) => current.filter((item) => item.key !== variant.key))} className="grid size-10 place-items-center rounded-control border border-border text-rose-700" aria-label="Remover nova variante"><Archive aria-hidden size={17} /></button> : null}</div></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className={`grid gap-1 ${labelClasses}`}>SKU<input required name={`variants[${index}][sku]`} value={variant.sku} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, sku: event.target.value.toUpperCase() } : item))} className={`${inputClasses} font-mono uppercase`} /></label>
                {configuredOptions.map((option) => <label key={option.id} className={`grid gap-1 ${labelClasses}`}>{option.name}<select value={variant.optionValues[option.name] ?? ""} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, optionValues: { ...item.optionValues, [option.name]: event.target.value } } : item))} className={inputClasses}>{optionValues(option).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
                {!variant.id ? <label className={`grid gap-1 ${labelClasses}`}>Preço inicial<input required name={`variants[${index}][price]`} inputMode="decimal" value={variant.price} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, price: event.target.value } : item))} className={inputClasses} /></label> : <div className="grid gap-1"><span className={labelClasses}>Preço atual</span><span className="flex min-h-11 items-center rounded-control bg-surface-strong px-3.5 text-sm font-bold text-foreground">{money.format(Number(variant.price.replace(",", ".")))}</span></div>}
                <label className={`grid gap-1 ${labelClasses}`}>Estoque<select name={`variants[${index}][stockMode]`} value={variant.stockMode} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, stockMode: event.target.value as StockMode } : item))} className={inputClasses}><option value="MADE_TO_ORDER">Sob encomenda</option><option value="TRACKED">Controlado</option></select></label>
                {variant.stockMode === "TRACKED" && !variant.id ? <label className={`grid gap-1 ${labelClasses}`}>Saldo inicial<input name={`variants[${index}][stock]`} type="number" min="0" value={variant.stock} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, stock: event.target.value } : item))} className={inputClasses} /></label> : <input type="hidden" name={`variants[${index}][stock]`} value={variant.stock} />}
                <label className={`grid gap-1 ${labelClasses}`}>Mínimo<input required name={`variants[${index}][minimumQuantity]`} type="number" min="1" value={variant.minimumQuantity} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, minimumQuantity: event.target.value } : item))} className={inputClasses} /></label>
                <label className={`grid gap-1 ${labelClasses}`}>Incremento<input required name={`variants[${index}][quantityIncrement]`} type="number" min="1" value={variant.quantityIncrement} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, quantityIncrement: event.target.value } : item))} className={inputClasses} /></label>
                <label className={`grid gap-1 ${labelClasses}`}>Peso (g)<input name={`variants[${index}][weight]`} type="number" min="0" placeholder="Pendente" value={variant.weight} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, weight: event.target.value } : item))} className={inputClasses} /></label>
                <label className={`grid gap-1 ${labelClasses}`}>Largura (cm)<input name={`variants[${index}][width]`} inputMode="decimal" placeholder="Pendente" value={variant.width} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, width: event.target.value } : item))} className={inputClasses} /></label>
                <label className={`grid gap-1 ${labelClasses}`}>Altura (cm)<input name={`variants[${index}][height]`} inputMode="decimal" placeholder="Pendente" value={variant.height} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, height: event.target.value } : item))} className={inputClasses} /></label>
                <label className={`grid gap-1 ${labelClasses}`}>Comprimento (cm)<input name={`variants[${index}][length]`} inputMode="decimal" placeholder="Pendente" value={variant.length} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, length: event.target.value } : item))} className={inputClasses} /></label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-premium sm:p-6" id="personalizacao">
        <div className="flex items-start gap-3 border-b border-border pb-5"><span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong"><Check aria-hidden size={20} weight="bold" /></span><div><h3 className="text-lg font-black text-foreground">Personalização</h3><p className="mt-1 text-sm leading-6 text-muted">Campos e acréscimos são calculados antes do pagamento.</p></div></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className={`grid gap-2 ${labelClasses}`}>Modo<select name="personalizationMode" value={personalizationMode} onChange={(event) => setPersonalizationMode(event.target.value as PersonalizationMode)} className={inputClasses}><option value="NONE">Sem personalização</option><option value="STRUCTURED_FIELDS">Campos estruturados</option><option value="ARTWORK_UPLOAD">Arquivo de arte</option></select></label><label className="inline-flex items-center gap-3 self-end pb-3 text-sm font-bold"><input type="checkbox" name="reviewRequired" value="true" defaultChecked={configuration.reviewRequired} className="size-4 accent-accent" />Exigir revisão humana</label></div>
        {personalizationMode === "STRUCTURED_FIELDS" ? <><div className="mt-5 space-y-3">{fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-control bg-surface-strong/60 p-4 md:grid-cols-2 lg:grid-cols-6"><input required name={`fields[${index}][key]`} value={field.key} placeholder="nome_gravacao" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, key: event.target.value } : item))} className={`${inputClasses} font-mono`} /><input required name={`fields[${index}][label]`} value={field.label} placeholder="Nome para gravação" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item))} className={inputClasses} /><select name={`fields[${index}][type]`} value={field.type} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, type: event.target.value as PersonalizationFieldType } : item))} className={inputClasses}><option value="TEXT">Texto</option><option value="LONG_TEXT">Texto longo</option><option value="SELECT">Seleção</option><option value="NUMBER">Número</option><option value="COLOR">Cor</option><option value="NOTE">Observação</option></select><input name={`fields[${index}][options]`} value={field.options} placeholder="Opções separadas por vírgula" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, options: event.target.value } : item))} className={inputClasses} /><input name={`fields[${index}][maximumLength]`} value={field.maximumLength} placeholder="Máx. caracteres" inputMode="numeric" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, maximumLength: event.target.value } : item))} className={inputClasses} /><div className="flex gap-2"><input name={`fields[${index}][price]`} value={field.price} placeholder="Acréscimo" inputMode="decimal" onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, price: event.target.value } : item))} className={inputClasses} /><button type="button" aria-label="Remover campo" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))} className="grid size-11 shrink-0 place-items-center rounded-control border border-border text-rose-700"><Minus aria-hidden size={16} /></button></div><label className="inline-flex items-center gap-2 text-xs font-bold text-muted"><input type="checkbox" name={`fields[${index}][required]`} value="true" checked={field.required} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, required: event.target.checked } : item))} className="size-4 accent-accent" />Obrigatório</label></div>)}</div><button type="button" onClick={() => setFields((current) => [...current, { id: crypto.randomUUID(), key: "", label: "", type: "TEXT", required: false, options: "", maximumLength: "240", price: "0,00" }])} className={`${secondaryButtonClasses} mt-4`}><Plus aria-hidden size={17} />Adicionar campo</button></> : null}
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-premium sm:p-6" id="atendimento">
        <div className="flex items-start gap-3 border-b border-border pb-5"><span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong"><Truck aria-hidden size={20} weight="bold" /></span><div><h3 className="text-lg font-black text-foreground">Atendimento</h3><p className="mt-1 text-sm leading-6 text-muted">A entrega exige peso e dimensões válidos em todas as variantes ativas.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="inline-flex min-h-11 items-center gap-3 rounded-control border border-border p-4 text-sm font-bold"><input type="checkbox" name="pickupEnabled" value="true" defaultChecked={configuration.fulfillmentOptions.includes("PICKUP")} className="size-4 accent-accent" />Retirada local gratuita</label><label className="inline-flex min-h-11 items-center gap-3 rounded-control border border-border p-4 text-sm font-bold"><input type="checkbox" name="shippingEnabled" value="true" defaultChecked={configuration.fulfillmentOptions.includes("SHIPPING")} className="size-4 accent-accent" />Entrega nacional</label></div>
      </section>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-card border border-accent/20 bg-white/95 p-4 shadow-premium-hover backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">As mudanças atualizam o catálogo, mas não alteram os snapshots de pedidos anteriores.</p><button type="submit" className={primaryButtonClasses}><Check aria-hidden size={18} weight="bold" />Salvar cadastro</button></div>
    </form>
  );
}
