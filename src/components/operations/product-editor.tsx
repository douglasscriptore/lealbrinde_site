"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowSquareOut,
  Check,
  Copy,
  FloppyDisk,
  Plus,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  CheckResultIcon,
  dangerButtonClasses,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
  StatusBadge,
} from "./operations-ui";
import type { ProductEditorData, ProductStatus, SemanticTone } from "./types";

const tabs = [
  ["basic", "Básico"],
  ["price", "Preço"],
  ["specifications", "Especificações"],
  ["files", "Arquivos"],
  ["production", "Produção"],
  ["payment", "Pagamento"],
  ["media", "Mídia"],
  ["seo", "SEO"],
  ["publication", "Publicação"],
] as const;

export type ProductEditorTab = (typeof tabs)[number][0];

export type ProductEditorAction =
  | "duplicate"
  | "archive"
  | "publish"
  | "publish-price-table"
  | "add-price-tier"
  | "add-specification"
  | "add-equipment"
  | "add-media";

export type ProductEditorProps = {
  product: ProductEditorData;
  saveAction?: ComponentProps<"form">["action"];
  previewHref?: string;
  onAction?: (
    action: ProductEditorAction,
    productId: string,
  ) => void | Promise<void>;
  isSaving?: boolean;
  saveError?: string;
  savedMessage?: string;
  readOnlySections?: ProductEditorTab[];
  readOnlyMessage?: string;
};

const statusTone: Record<ProductStatus, SemanticTone> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

const statusLabel: Record<ProductStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

function Field({
  label,
  htmlFor,
  helper,
  children,
}: {
  label: string;
  htmlFor: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className={labelClasses} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {helper ? (
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400" id={`${htmlFor}-help`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function BasicFields({ product }: { product: ProductEditorData }) {
  return (
    <EditorSection
      description="Informações principais usadas no catálogo e na operação."
      title="Dados do produto"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field htmlFor="product-name" label="Nome">
          <input
            className={inputClasses}
            defaultValue={product.name}
            id="product-name"
            name="name"
            required
          />
        </Field>
        <Field htmlFor="product-code" label="Código interno">
          <input
            className={inputClasses}
            defaultValue={product.internalCode}
            id="product-code"
            name="internalCode"
            readOnly
            required
          />
        </Field>
        <Field
          helper="Use um caminho em letras minúsculas, números, barras e hífens."
          htmlFor="product-slug"
          label="Slug"
        >
          <input
            aria-describedby="product-slug-help"
            className={inputClasses}
            defaultValue={product.slug}
            id="product-slug"
            name="slug"
            pattern="/?[a-z0-9]+(?:[/\-][a-z0-9]+)*"
            required
          />
        </Field>
        <Field htmlFor="product-type" label="Tipo">
          <select
            className={inputClasses}
            defaultValue={product.type}
            disabled
            id="product-type"
          >
            <option value="DTF_BY_METER">DTF por metro</option>
            <option value="STANDARD_PRODUCT">Produto padrão</option>
          </select>
          <input name="type" type="hidden" value={product.type} />
        </Field>
      </div>
      <Field htmlFor="product-summary" label="Resumo">
        <textarea
          className={`${inputClasses} min-h-24 resize-y`}
          defaultValue={product.summary}
          id="product-summary"
          name="summary"
          required
        />
      </Field>
      <Field htmlFor="product-description" label="Descrição completa">
        <textarea
          className={`${inputClasses} min-h-40 resize-y`}
          defaultValue={product.description}
          id="product-description"
          name="description"
          required
        />
      </Field>
      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
        <input
          className="mt-0.5 size-4 accent-[#007FA8]"
          defaultChecked={product.featured}
          name="featured"
          type="checkbox"
          value="true"
        />
        <span>
          <span className="block font-semibold text-slate-900 dark:text-white">
            Destacar na página principal
          </span>
          <span className="mt-1 block leading-5 text-slate-600 dark:text-slate-300">
            Apenas um produto DTF deve ocupar o destaque principal.
          </span>
        </span>
      </label>
    </EditorSection>
  );
}

function PriceFields({
  product,
  onAdd,
  onPublish,
}: {
  product: ProductEditorData;
  onAdd: () => void;
  onPublish: () => void;
}) {
  const sortedTiers = [...product.priceTiers].sort(
    (a, b) => a.minimumMeters - b.minimumMeters,
  );
  const approvedBreak = sortedTiers.find((tier, index) => {
    const next = sortedTiers[index + 1];
    if (!next || !tier.maximumMeters) return false;
    return (
      tier.maximumMeters * tier.unitPriceCents >
      next.minimumMeters * next.unitPriceCents
    );
  });
  const breakIndex = approvedBreak ? sortedTiers.indexOf(approvedBreak) : -1;
  const nextBreakTier = breakIndex >= 0 ? sortedTiers[breakIndex + 1] : undefined;

  return (
    <EditorSection
      description="O preço da faixa atingida é aplicado a todos os metros do pedido."
      title="Tabela de preços"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Field htmlFor="price-unit" label="Unidade">
          <input
            className={inputClasses}
            defaultValue={product.unit}
            id="price-unit"
            name="unit"
            readOnly
          />
        </Field>
        <Field htmlFor="minimum-meters" label="Quantidade mínima">
          <input
            className={inputClasses}
            defaultValue={product.minimumMeters}
            id="minimum-meters"
            min={1}
            name="minimumMeters"
            required
            step={1}
            type="number"
          />
        </Field>
        <Field htmlFor="meter-increment" label="Incremento">
          <input
            className={inputClasses}
            defaultValue={product.meterIncrement}
            id="meter-increment"
            min={1}
            name="meterIncrement"
            required
            step={1}
            type="number"
          />
        </Field>
        <Field htmlFor="price-table-name" label="Versão gerada">
          <input
            className={inputClasses}
            defaultValue={product.priceTableName}
            id="price-table-name"
            readOnly
          />
        </Field>
        <Field htmlFor="price-effective-from" label="Vigência">
          <input
            className={inputClasses}
            defaultValue={product.priceEffectiveFrom}
            id="price-effective-from"
            name="priceEffectiveFrom"
            type="datetime-local"
          />
        </Field>
      </div>

      {approvedBreak && nextBreakTier ? (
        <div
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          role="status"
        >
          <WarningCircle aria-hidden="true" className="mt-0.5 shrink-0" size={20} weight="fill" />
          <div>
            <p className="text-sm font-bold">Quebra de curva aprovada</p>
            <p className="mt-1 text-sm leading-6">
              Ao atingir {nextBreakTier.minimumMeters} metros, o total fica menor
              que em {approvedBreak.maximumMeters} metros. O site mostrará essa
              oportunidade sem alterar a quantidade automaticamente.
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[700px] text-left text-sm">
          <caption className="sr-only">Faixas de preço do produto</caption>
          <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3" scope="col">A partir de</th>
              <th className="px-4 py-3" scope="col">Até</th>
              <th className="px-4 py-3" scope="col">Valor por metro</th>
              <th className="px-4 py-3" scope="col">Exemplo no início</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {sortedTiers.map((tier, index) => (
              <tr key={tier.id}>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`tier-${tier.id}-minimum`}>
                    Quantidade mínima da faixa {index + 1}
                  </label>
                  <input
                    className={inputClasses}
                    defaultValue={tier.minimumMeters}
                    id={`tier-${tier.id}-minimum`}
                    min={1}
                    name={`priceTiers[${index}][minimumMeters]`}
                    required
                    step={1}
                    type="number"
                  />
                </td>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`tier-${tier.id}-maximum`}>
                    Quantidade máxima da faixa {index + 1}
                  </label>
                  <input
                    className={inputClasses}
                    defaultValue={tier.maximumMeters ?? ""}
                    id={`tier-${tier.id}-maximum`}
                    min={tier.minimumMeters}
                    name={`priceTiers[${index}][maximumMeters]`}
                    placeholder="Sem limite"
                    step={1}
                    type="number"
                  />
                </td>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`tier-${tier.id}-price`}>
                    Valor por metro da faixa {index + 1}
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#008CB8] focus-within:ring-2 focus-within:ring-[#00AEEF]/30 dark:border-slate-700 dark:bg-slate-950">
                    <span className="pl-3 text-sm text-slate-500">R$</span>
                    <input
                      className="min-h-11 min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                      defaultValue={(tier.unitPriceCents / 100).toFixed(2)}
                      id={`tier-${tier.id}-price`}
                      min="0.01"
                      name={`priceTiers[${index}][unitPrice]`}
                      required
                      step="0.01"
                      type="number"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                  {tier.minimumMeters} m = {formatMoney(tier.minimumMeters * tier.unitPriceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className={secondaryButtonClasses} onClick={onAdd} type="button">
        <Plus aria-hidden="true" size={18} weight="bold" />
        Adicionar faixa
      </button>
      {product.priceTableStatus === "DRAFT" ? (
        <button className={primaryButtonClasses} onClick={onPublish} type="button">
          <Check aria-hidden="true" size={18} weight="bold" />
          Publicar esta versão de preço
        </button>
      ) : null}

      <div>
        <h4 className="text-sm font-bold text-slate-950 dark:text-white">
          Histórico de versões
        </h4>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">Histórico das tabelas de preço</caption>
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3" scope="col">Versão</th>
                <th className="px-4 py-3" scope="col">Estado</th>
                <th className="px-4 py-3" scope="col">Início</th>
                <th className="px-4 py-3" scope="col">Fim</th>
                <th className="px-4 py-3" scope="col">Faixas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {product.priceHistory.map((history) => (
                <tr key={history.id}>
                  <td className="px-4 py-3 font-bold">v{history.version}</td>
                  <td className="px-4 py-3">
                    {history.active
                      ? "Vigente"
                      : history.status === "DRAFT"
                        ? "Rascunho"
                        : history.status === "PUBLISHED"
                          ? "Agendada"
                          : "Arquivada"}
                  </td>
                  <td className="px-4 py-3">{history.validFromLabel}</td>
                  <td className="px-4 py-3">{history.validUntilLabel ?? "Sem término"}</td>
                  <td className="px-4 py-3">{history.tierCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EditorSection>
  );
}

function SpecificationFields({
  product,
  onAdd,
}: {
  product: ProductEditorData;
  onAdd: () => void;
}) {
  return (
    <EditorSection
      description="Organize dados técnicos em blocos curtos e verificáveis."
      title="Especificações técnicas"
    >
      <div className="space-y-4">
        {product.specifications.map((specification, index) => (
          <fieldset
            className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[0.8fr_1fr_2fr_auto] md:items-start"
            key={specification.id}
          >
            <legend className="sr-only">Especificação {index + 1}</legend>
            <Field htmlFor={`spec-${specification.id}-group`} label="Grupo">
              <input
                className={inputClasses}
                defaultValue={specification.group}
                id={`spec-${specification.id}-group`}
                name={`specifications[${index}][group]`}
                required
              />
            </Field>
            <Field htmlFor={`spec-${specification.id}-title`} label="Título">
              <input
                className={inputClasses}
                defaultValue={specification.title}
                id={`spec-${specification.id}-title`}
                name={`specifications[${index}][title]`}
                required
              />
            </Field>
            <Field htmlFor={`spec-${specification.id}-description`} label="Descrição">
              <textarea
                className={`${inputClasses} min-h-24 resize-y`}
                defaultValue={specification.description}
                id={`spec-${specification.id}-description`}
                name={`specifications[${index}][description]`}
                required
              />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold md:mt-7">
              <input
                className="size-4 accent-[#007FA8]"
                defaultChecked={specification.visible}
                name={`specifications[${index}][visible]`}
                type="checkbox"
                value="true"
              />
              Visível
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold md:col-start-4">
              <input
                className="size-4 accent-[#007FA8]"
                defaultChecked={specification.confirmed}
                name={`specifications[${index}][confirmed]`}
                type="checkbox"
                value="true"
              />
              Alegação confirmada
            </label>
            <input
              name={`specifications[${index}][position]`}
              type="hidden"
              value={specification.position}
            />
          </fieldset>
        ))}
      </div>
      <button className={secondaryButtonClasses} onClick={onAdd} type="button">
        <Plus aria-hidden="true" size={18} weight="bold" />
        Adicionar especificação
      </button>
    </EditorSection>
  );
}

function FileFields({ product }: { product: ProductEditorData }) {
  return (
    <EditorSection
      description="Essas regras são exibidas antes do upload e usadas pelo preflight."
      title="Política de arquivos"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          helper="Separe os formatos por vírgula."
          htmlFor="accepted-formats"
          label="Formatos permitidos"
        >
          <input
            aria-describedby="accepted-formats-help"
            className={inputClasses}
            defaultValue={product.acceptedFormats.join(", ")}
            id="accepted-formats"
            name="acceptedFormats"
            placeholder="PNG, PDF, TIFF"
            required
          />
        </Field>
        <Field htmlFor="maximum-file-size" label="Tamanho máximo em MB">
          <input
            className={inputClasses}
            defaultValue={product.maximumFileSizeMb}
            id="maximum-file-size"
            min={1}
            name="maximumFileSizeMb"
            required
            type="number"
          />
        </Field>
        <Field htmlFor="printable-width" label="Largura útil em cm">
          <input
            className={inputClasses}
            defaultValue={product.printableWidthCm}
            id="printable-width"
            min="0.1"
            name="printableWidthCm"
            required
            step="0.1"
            type="number"
          />
        </Field>
        <Field htmlFor="recommended-dpi" label="Resolução recomendada em DPI">
          <input
            className={inputClasses}
            defaultValue={product.recommendedDpi}
            id="recommended-dpi"
            min={72}
            name="recommendedDpi"
            required
            step={1}
            type="number"
          />
        </Field>
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
          <input
            className="mt-0.5 size-4 accent-[#007FA8]"
            defaultChecked={product.requiresTransparentBackground}
            name="requiresTransparentBackground"
            type="checkbox"
            value="true"
          />
          Exigir fundo transparente
        </label>
        <Field htmlFor="color-policy" label="Política de cores">
          <textarea
            className={`${inputClasses} min-h-28 resize-y`}
            defaultValue={product.colorPolicy}
            id="color-policy"
            name="colorPolicy"
            required
          />
        </Field>
      </div>
      <Field htmlFor="file-preparation-guide" label="Guia de preparação">
        <textarea
          className={`${inputClasses} min-h-32 resize-y`}
          defaultValue={product.filePreparationGuide}
          id="file-preparation-guide"
          name="filePreparationGuide"
          required
        />
      </Field>
      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <input
          className="mt-0.5 size-4 accent-[#007FA8]"
          defaultChecked={product.filePolicyConfirmed}
          name="filePolicyConfirmed"
          type="checkbox"
          value="true"
        />
        Confirmo que formatos, tamanho, largura e instruções foram validados pela produção
      </label>
    </EditorSection>
  );
}

function ProductionFields({
  product,
  onAdd,
}: {
  product: ProductEditorData;
  onAdd: () => void;
}) {
  const nominalCapacity = product.equipment.reduce(
    (total, equipment) => total + equipment.quantity * equipment.metersPerHour,
    0,
  );

  return (
    <div className="space-y-8">
      <EditorSection
        description="A capacidade nominal é informativa e não define o prazo real do pedido."
        title="Equipamentos"
      >
        <div className="rounded-xl bg-[#E5F8FE] p-4 text-[#005E7C] dark:bg-[#073A4A] dark:text-[#A6E8FA]">
          <p className="text-sm font-semibold">Capacidade nominal calculada</p>
          <p className="mt-1 text-2xl font-black tracking-tight">{nominalCapacity} metros por hora</p>
        </div>
        <div className="space-y-3">
          {product.equipment.map((equipment, index) => (
            <fieldset
              className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-3"
              key={equipment.id}
            >
              <legend className="sr-only">Equipamento {index + 1}</legend>
              <Field htmlFor={`equipment-${equipment.id}-name`} label="Equipamento">
                <input
                  className={inputClasses}
                  defaultValue={equipment.name}
                  id={`equipment-${equipment.id}-name`}
                  name={`equipment[${index}][name]`}
                  required
                />
              </Field>
              <Field htmlFor={`equipment-${equipment.id}-quantity`} label="Quantidade">
                <input
                  className={inputClasses}
                  defaultValue={equipment.quantity}
                  id={`equipment-${equipment.id}-quantity`}
                  min={1}
                  name={`equipment[${index}][quantity]`}
                  required
                  step={1}
                  type="number"
                />
              </Field>
              <Field htmlFor={`equipment-${equipment.id}-speed`} label="Metros por hora">
                <input
                  className={inputClasses}
                  defaultValue={equipment.metersPerHour}
                  id={`equipment-${equipment.id}-speed`}
                  min="0.1"
                  name={`equipment[${index}][metersPerHour]`}
                  required
                  step="0.1"
                  type="number"
                />
              </Field>
            </fieldset>
          ))}
        </div>
        <button className={secondaryButtonClasses} onClick={onAdd} type="button">
          <Plus aria-hidden="true" size={18} weight="bold" />
          Adicionar equipamento
        </button>
      </EditorSection>

      <EditorSection
        description="O relógio começa somente após o Pix confirmado e a arte aprovada."
        title="Política de produção"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field htmlFor="start-within-hours" label="Iniciar em até horas úteis">
            <input
              className={inputClasses}
              defaultValue={product.standardStartWithinBusinessHours}
              id="start-within-hours"
              min={1}
              name="standardStartWithinBusinessHours"
              required
              step={1}
              type="number"
            />
          </Field>
          <Field htmlFor="custom-lead-time" label="Prazo manual acima de metros">
            <input
              className={inputClasses}
              defaultValue={product.customLeadTimeAboveMeters}
              id="custom-lead-time"
              min={1}
              name="customLeadTimeAboveMeters"
              required
              step={1}
              type="number"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
            <input
              className="size-4 accent-[#007FA8]"
              defaultChecked={product.pickupEnabled}
              name="pickupEnabled"
              type="checkbox"
              value="true"
            />
            Retirada habilitada
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
            <input
              className="size-4 accent-[#007FA8]"
              defaultChecked={product.shippingEnabled}
              name="shippingEnabled"
              type="checkbox"
              value="true"
            />
            Entrega habilitada
          </label>
        </div>
      </EditorSection>
    </div>
  );
}

function PaymentFields({ product }: { product: ProductEditorData }) {
  return (
    <EditorSection
      description="Produtos DTF aceitam somente Pix antes da revisão humana."
      title="Pagamento"
    >
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#9ADFF3] bg-[#F0FBFE] p-4 text-sm font-semibold text-[#005E7C] dark:border-[#176079] dark:bg-[#073A4A] dark:text-[#A6E8FA]">
        <input
          className="size-4 accent-[#007FA8]"
          defaultChecked
          name="paymentMethods"
          readOnly
          type="checkbox"
          value="PIX"
        />
        Pix como forma exclusiva de pagamento
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <Field htmlFor="pix-expiration" label="Expiração do Pix em minutos">
          <input
            className={inputClasses}
            defaultValue={product.pixExpirationMinutes}
            id="pix-expiration"
            min={5}
            name="pixExpirationMinutes"
            required
            step={1}
            type="number"
          />
        </Field>
      </div>
      <Field htmlFor="refund-policy" label="Política de cancelamento e reembolso">
        <textarea
          className={`${inputClasses} min-h-36 resize-y`}
          defaultValue={product.refundPolicy}
          id="refund-policy"
          name="refundPolicy"
          required
        />
      </Field>
    </EditorSection>
  );
}

function MediaFields({
  product,
  onAdd,
}: {
  product: ProductEditorData;
  onAdd: () => void;
}) {
  return (
    <EditorSection
      description="Use imagens reais da produção e descreva o conteúdo para leitores de tela."
      title="Mídia"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field htmlFor="cover-image-url" label="URL da imagem principal">
          <input
            className={inputClasses}
            defaultValue={product.coverImageUrl}
            id="cover-image-url"
            name="coverImageUrl"
            placeholder="/images/producao-dtf.jpg"
            type="text"
          />
        </Field>
        <Field htmlFor="cover-image-alt" label="Texto alternativo">
          <input
            className={inputClasses}
            defaultValue={product.coverImageAlt}
            id="cover-image-alt"
            name="coverImageAlt"
          />
        </Field>
      </div>
      <div className="space-y-3">
        {product.media.map((media, index) => (
          <fieldset
            className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_1fr_auto] md:items-end"
            key={media.id}
          >
            <legend className="sr-only">Mídia {index + 1}</legend>
            <Field htmlFor={`media-${media.id}-url`} label="URL">
              <input
                className={inputClasses}
                defaultValue={media.url}
                id={`media-${media.id}-url`}
                name={`media[${index}][url]`}
                placeholder="/images/producao-dtf.jpg"
                type="text"
              />
            </Field>
            <Field htmlFor={`media-${media.id}-alt`} label="Texto alternativo">
              <input
                className={inputClasses}
                defaultValue={media.alt}
                id={`media-${media.id}-alt`}
                name={`media[${index}][alt]`}
              />
            </Field>
            <input name={`media[${index}][position]`} type="hidden" value={media.position} />
          </fieldset>
        ))}
      </div>
      <button className={secondaryButtonClasses} onClick={onAdd} type="button">
        <UploadSimple aria-hidden="true" size={18} />
        Adicionar mídia
      </button>
    </EditorSection>
  );
}

function SeoFields({ product }: { product: ProductEditorData }) {
  return (
    <EditorSection
      description="Revise como o produto aparecerá na busca e no compartilhamento."
      title="SEO"
    >
      <Field htmlFor="seo-title" label="Título SEO">
        <input
          className={inputClasses}
          defaultValue={product.seoTitle}
          id="seo-title"
          maxLength={70}
          name="seoTitle"
          required
        />
      </Field>
      <Field htmlFor="seo-description" label="Descrição SEO">
        <textarea
          className={`${inputClasses} min-h-28 resize-y`}
          defaultValue={product.seoDescription}
          id="seo-description"
          maxLength={170}
          name="seoDescription"
          required
        />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field htmlFor="canonical-url" label="URL canônica">
          <input
            className={inputClasses}
            defaultValue={product.canonicalUrl}
            id="canonical-url"
            name="canonicalUrl"
            placeholder="/dtf/textil-por-metro"
            type="text"
          />
        </Field>
        <Field htmlFor="social-image-url" label="Imagem social">
          <input
            className={inputClasses}
            defaultValue={product.socialImageUrl}
            id="social-image-url"
            name="socialImageUrl"
            placeholder="/images/compartilhamento-dtf.jpg"
            type="text"
          />
        </Field>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Prévia na busca</p>
        <p className="mt-2 text-lg font-semibold text-[#006E91] dark:text-[#72D9F7]">
          {product.seoTitle || product.name}
        </p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          lealbrinde.com.br{product.slug.startsWith("/") ? product.slug : `/dtf/${product.slug}`}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {product.seoDescription || product.summary}
        </p>
      </div>
    </EditorSection>
  );
}

function PublicationFields({
  product,
  onPublish,
  disabled = false,
}: {
  product: ProductEditorData;
  onPublish: () => void;
  disabled?: boolean;
}) {
  const missing = product.publicationChecks.filter((check) => !check.complete);

  return (
    <EditorSection
      description="Todos os itens obrigatórios devem estar completos antes da publicação."
      title="Checklist de publicação"
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {product.publicationChecks.map((check) => (
          <li
            className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            key={check.id}
          >
            <CheckResultIcon complete={check.complete} />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {check.label}
              </span>
              {check.description ? (
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {check.description}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {missing.length ? (
        <div
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          role="alert"
        >
          <WarningCircle aria-hidden="true" className="mt-0.5 shrink-0" size={20} weight="fill" />
          <div>
            <p className="text-sm font-bold">Publicação bloqueada</p>
            <p className="mt-1 text-sm leading-6">
              Complete {missing.length} {missing.length === 1 ? "item obrigatório" : "itens obrigatórios"} antes de publicar.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <Check aria-hidden="true" className="mt-0.5 shrink-0" size={20} weight="bold" />
          <div>
            <p className="text-sm font-bold">Produto pronto para publicação</p>
            <p className="mt-1 text-sm leading-6">
              Salve as alterações e revise a prévia antes de publicar.
            </p>
          </div>
        </div>
      )}
      <button
        className={primaryButtonClasses}
        disabled={disabled || missing.length > 0 || product.status === "PUBLISHED"}
        onClick={onPublish}
        type="button"
      >
        <Check aria-hidden="true" size={18} weight="bold" />
        Publicar produto
      </button>
    </EditorSection>
  );
}

export function ProductEditor({
  product,
  saveAction,
  previewHref,
  onAction,
  isSaving = false,
  saveError,
  savedMessage,
  readOnlySections = [],
  readOnlyMessage =
    "Esta seção está disponível para consulta. A edição será habilitada quando o contrato do repositório estiver pronto.",
}: ProductEditorProps) {
  const [activeTab, setActiveTab] = useState<ProductEditorTab>("basic");
  const [editableProduct, setEditableProduct] = useState(product);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isReadOnly = readOnlySections.includes(activeTab);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  const changeTab = (nextTab: ProductEditorTab) => {
    if (nextTab === activeTab) return;
    if (
      hasUnsavedChanges &&
      !window.confirm("Há alterações não salvas nesta seção. Descartar e trocar de aba?")
    ) {
      return;
    }
    setHasUnsavedChanges(false);
    setActiveTab(nextTab);
  };

  const dispatch = (action: ProductEditorAction) => {
    if (action === "add-price-tier") {
      setHasUnsavedChanges(true);
      setEditableProduct((current) => {
        const tiers = [...current.priceTiers];
        const last = tiers.at(-1);
        const nextMinimum = last
          ? (last.maximumMeters ?? last.minimumMeters) + 1
          : current.minimumMeters;
        if (last && last.maximumMeters === undefined) {
          tiers[tiers.length - 1] = {
            ...last,
            maximumMeters: nextMinimum - 1,
          };
        }
        tiers.push({
          id: `new-tier-${crypto.randomUUID()}`,
          minimumMeters: nextMinimum,
          unitPriceCents: last?.unitPriceCents ?? 100,
        });
        return { ...current, priceTiers: tiers };
      });
      return;
    }
    if (action === "add-specification") {
      setHasUnsavedChanges(true);
      setEditableProduct((current) => ({
        ...current,
        specifications: [
          ...current.specifications,
          {
            id: `new-specification-${crypto.randomUUID()}`,
            group: "",
            title: "",
            description: "",
            position: current.specifications.length,
            visible: true,
            confirmed: false,
          },
        ],
      }));
      return;
    }
    if (action === "add-equipment") {
      setHasUnsavedChanges(true);
      setEditableProduct((current) => ({
        ...current,
        equipment: [
          ...current.equipment,
          {
            id: `new-equipment-${crypto.randomUUID()}`,
            name: "",
            quantity: 1,
            metersPerHour: 1,
          },
        ],
      }));
      return;
    }
    if (action === "add-media") {
      setHasUnsavedChanges(true);
      setEditableProduct((current) => ({
        ...current,
        media: [
          ...current.media,
          {
            id: `new-media-${crypto.randomUUID()}`,
            url: "",
            alt: "",
            position: current.media.length,
          },
        ],
      }));
      return;
    }
    if (hasUnsavedChanges) {
      window.alert("Salve ou descarte as alterações da seção antes desta ação.");
      return;
    }
    onAction?.(action, product.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {product.name}
            </h2>
            <StatusBadge tone={statusTone[product.status]}>
              {statusLabel[product.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
            {product.internalCode} · {product.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewHref ? (
            <a
              className={secondaryButtonClasses}
              href={previewHref}
              onClick={(event) => {
                if (
                  hasUnsavedChanges &&
                  !window.confirm("Há alterações não salvas. Abrir a prévia mesmo assim?")
                ) {
                  event.preventDefault();
                }
              }}
            >
              <ArrowSquareOut aria-hidden="true" size={18} />
              Prévia
            </a>
          ) : null}
          <button
            className={secondaryButtonClasses}
            onClick={() => dispatch("duplicate")}
            type="button"
          >
            <Copy aria-hidden="true" size={18} />
            Duplicar
          </button>
          <button
            className={dangerButtonClasses}
            onClick={() => {
              if (window.confirm("Arquivar este produto e impedir novos pedidos?")) {
                dispatch("archive");
              }
            }}
            type="button"
          >
            <Archive aria-hidden="true" size={18} />
            Arquivar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          <div
            aria-label="Seções do produto"
            className="flex min-w-max px-3"
            role="tablist"
          >
            {tabs.map(([id, label]) => (
              <button
                aria-controls={`product-panel-${id}`}
                aria-selected={activeTab === id}
                className={`min-h-12 border-b-2 px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00AEEF] ${
                  activeTab === id
                    ? "border-[#008CB8] text-[#006E91] dark:text-[#72D9F7]"
                    : "border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                }`}
                id={`product-tab-${id}`}
                key={id}
                onClick={() => changeTab(id)}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form
          action={saveAction}
          aria-busy={isSaving}
          onChange={() => setHasUnsavedChanges(true)}
          onSubmit={() => setHasUnsavedChanges(false)}
        >
          <input name="productId" type="hidden" value={product.id} />
          <input name="section" type="hidden" value={activeTab} />
          <div
            aria-labelledby={`product-tab-${activeTab}`}
            className="p-5 sm:p-6"
            id={`product-panel-${activeTab}`}
            role="tabpanel"
            tabIndex={0}
          >
            {activeTab === "basic" ? <BasicFields product={editableProduct} /> : null}
            {activeTab === "price" ? (
              <PriceFields
                product={editableProduct}
                onAdd={() => dispatch("add-price-tier")}
                onPublish={() => dispatch("publish-price-table")}
              />
            ) : null}
            {activeTab === "specifications" ? (
              <SpecificationFields
                product={editableProduct}
                onAdd={() => dispatch("add-specification")}
              />
            ) : null}
            {activeTab === "files" ? <FileFields product={editableProduct} /> : null}
            {activeTab === "production" ? (
              <ProductionFields product={editableProduct} onAdd={() => dispatch("add-equipment")} />
            ) : null}
            {activeTab === "payment" ? <PaymentFields product={editableProduct} /> : null}
            {activeTab === "media" ? (
              <MediaFields product={editableProduct} onAdd={() => dispatch("add-media")} />
            ) : null}
            {activeTab === "seo" ? <SeoFields product={editableProduct} /> : null}
            {activeTab === "publication" ? (
              <PublicationFields
                disabled={isReadOnly}
                product={editableProduct}
                onPublish={() => dispatch("publish")}
              />
            ) : null}
          </div>

          {saveError ? (
            <p
              className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200 sm:mx-6"
              role="alert"
            >
              {saveError}
            </p>
          ) : null}
          {savedMessage ? (
            <p
              className="mx-5 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 sm:mx-6"
              role="status"
            >
              {savedMessage}
            </p>
          ) : null}
          {isReadOnly ? (
            <p className="mx-5 mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200 sm:mx-6">
              {readOnlyMessage}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Esta ação salva somente a seção aberta.
            </p>
            <button
              className={primaryButtonClasses}
              disabled={isSaving || isReadOnly}
              type="submit"
            >
              <FloppyDisk aria-hidden="true" size={18} weight="bold" />
              {isSaving ? "Salvando" : "Salvar seção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
