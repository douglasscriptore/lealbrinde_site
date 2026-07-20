"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { ProductEditorAction } from "@/components/operations";
import {
  PublicationValidationError,
  validateDtfProductForPublication,
} from "@/domain";
import { auth } from "@/server/auth/auth";
import { requireStaff } from "@/server/auth/session";
import {
  ArtworkVersionRepository,
  CommerceRepository,
  isArtworkReadyForHumanReview,
  openDatabase,
  OrderRepository,
  ProductRepository,
  PaymentAttemptRepository,
} from "@/server/db";
import { getCommercePaymentGateway, getPaymentGateway } from "@/server/integrations/payment-gateway";

function requiredText(data: FormData, key: string): string {
  const value = String(data.get(key) ?? "").trim();
  if (!value) throw new Error(`O campo ${key} é obrigatório.`);
  return value;
}

function requiredMoneyCents(data: FormData, key: string): number {
  const raw = requiredText(data, key);
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Informe um valor válido em ${key}.`);
  return Math.round(value * 100);
}

function optionalNonNegativeNumber(data: FormData, key: string): number {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) throw new Error(`Informe um valor válido em ${key}.`);
  return value;
}

function errorMessage(error: unknown): string {
  if (error instanceof PublicationValidationError) {
    return error.checklist.errors.map((issue) => issue.message).join(" ");
  }
  return error instanceof Error ? error.message : "Não foi possível concluir a ação.";
}

function productUrl(productId: string, kind: "erro" | "sucesso", message: string) {
  return `/admin/produtos/${productId}?${kind}=${encodeURIComponent(message)}`;
}

function parsePriceTiers(data: FormData) {
  const indexes = new Set<number>();
  for (const key of data.keys()) {
    const match = /^priceTiers\[(\d+)]\[minimumMeters]$/.exec(key);
    if (match) indexes.add(Number(match[1]));
  }

  return [...indexes]
    .sort((left, right) => left - right)
    .map((index, position) => {
      const minimumMeters = Number(
        requiredText(data, `priceTiers[${index}][minimumMeters]`),
      );
      const maximum = String(
        data.get(`priceTiers[${index}][maximumMeters]`) ?? "",
      ).trim();
      const unitPrice = Number(
        requiredText(data, `priceTiers[${index}][unitPrice]`).replace(",", "."),
      );
      if (!Number.isInteger(minimumMeters) || minimumMeters < 1) {
        throw new Error("As quantidades das faixas precisam ser inteiras.");
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new Error("Informe um valor válido para cada faixa.");
      }
      const maximumMeters = maximum ? Number(maximum) : null;
      if (
        maximumMeters !== null &&
        (!Number.isInteger(maximumMeters) || maximumMeters < minimumMeters)
      ) {
        throw new Error("O limite final de uma faixa é inválido.");
      }
      return {
        minimumMeters,
        maximumExclusiveMeters:
          maximumMeters === null ? null : maximumMeters + 1,
        unitPriceCents: Math.round(unitPrice * 100),
        position,
      };
    });
}

function requiredPositiveInteger(data: FormData, key: string, minimum = 1) {
  const value = Number(requiredText(data, key));
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`O campo ${key} precisa ser um inteiro a partir de ${minimum}.`);
  }
  return value;
}

function optionalBrazilDateTime(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Informe uma data e hora de vigência válidas.");
  }
  const date = new Date(`${value}:00-03:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Informe uma data e hora de vigência válidas.");
  }
  return date.toISOString();
}

function indexedFormEntries(data: FormData, prefix: string, field: string) {
  const indexes = new Set<number>();
  const expression = new RegExp(`^${prefix}\\[(\\d+)]\\[${field}]$`);
  for (const key of data.keys()) {
    const match = expression.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes].sort((left, right) => left - right);
}

function parseSpecifications(data: FormData) {
  return indexedFormEntries(data, "specifications", "group").map(
    (index, position) => ({
      group: requiredText(data, `specifications[${index}][group]`),
      title: requiredText(data, `specifications[${index}][title]`),
      description: requiredText(data, `specifications[${index}][description]`),
      position,
      visible: data.get(`specifications[${index}][visible]`) === "true",
      confirmed: data.get(`specifications[${index}][confirmed]`) === "true",
    }),
  );
}

function parseEquipment(data: FormData) {
  return indexedFormEntries(data, "equipment", "name").map((index) => {
    const metersPerHour = Number(
      requiredText(data, `equipment[${index}][metersPerHour]`).replace(",", "."),
    );
    if (!Number.isFinite(metersPerHour) || metersPerHour <= 0) {
      throw new Error("Informe uma capacidade válida para cada equipamento.");
    }
    return {
      name: requiredText(data, `equipment[${index}][name]`),
      quantity: requiredPositiveInteger(data, `equipment[${index}][quantity]`),
      unitCapacityMetersPerHour: metersPerHour,
    };
  });
}

export async function saveProductSectionAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const section = requiredText(data, "section");
  const db = openDatabase();
  let failure: string | null = null;
  let success = "Alterações salvas.";

  try {
    const products = new ProductRepository(db);
    const current = products.findById(productId);
    if (!current) throw new Error("Produto não encontrado.");

    const saveSection = db.transaction(() => {
    if (section === "basic") {
      products.updateProduct(
        productId,
        {
          name: requiredText(data, "name"),
          slug: requiredText(data, "slug"),
          summary: requiredText(data, "summary"),
          description: requiredText(data, "description"),
          featured: data.get("featured") === "true",
        },
        session.user.id,
      );
    } else if (section === "price") {
      const tiers = parsePriceTiers(data);
      if (!tiers.length) throw new Error("Cadastre ao menos uma faixa de preço.");
      const aggregate = products.getDtfAggregate(productId);
      if (!aggregate) throw new Error("Produto DTF não encontrado.");
      db.transaction(() => {
        products.updateDtfConfiguration(
          productId,
          {
            minimumMeters: requiredPositiveInteger(data, "minimumMeters"),
            meterIncrement: requiredPositiveInteger(data, "meterIncrement"),
            printableWidthCm: aggregate.configuration.printableWidthCm,
            fulfillmentOptions: aggregate.configuration.fulfillmentOptions,
          },
          session.user.id,
        );
        products.createPriceTableVersion(productId, tiers, {
          actorId: session.user.id,
          validFrom: optionalBrazilDateTime(data, "priceEffectiveFrom"),
        });
      })();
      success = "Nova versão da tabela criada como rascunho.";
    } else if (section === "specifications") {
      products.replaceSpecifications(
        productId,
        parseSpecifications(data),
        session.user.id,
      );
      success = "Especificações e confirmações atualizadas.";
    } else if (section === "files") {
      const aggregate = products.getDtfAggregate(productId);
      if (!aggregate?.filePolicy) throw new Error("Política de arquivo não encontrada.");
      const printableWidthCm = Number(
        requiredText(data, "printableWidthCm").replace(",", "."),
      );
      if (!Number.isFinite(printableWidthCm) || printableWidthCm <= 0) {
        throw new Error("Informe uma largura útil válida.");
      }
      const acceptedExtensions = requiredText(data, "acceptedFormats")
        .split(",")
        .map((extension) => extension.trim())
        .filter(Boolean);
      db.transaction(() => {
        products.updateDtfConfiguration(
          productId,
          {
            minimumMeters: aggregate.configuration.minimumMeters,
            meterIncrement: aggregate.configuration.meterIncrement,
            printableWidthCm,
            fulfillmentOptions: aggregate.configuration.fulfillmentOptions,
          },
          session.user.id,
        );
        products.updateFilePolicy(
          productId,
          {
            acceptedExtensions,
            maximumFileSizeMb: requiredPositiveInteger(data, "maximumFileSizeMb"),
            minimumResolutionDpi: requiredPositiveInteger(data, "recommendedDpi", 72),
            requiresTransparentBackground:
              data.get("requiresTransparentBackground") === "true",
            colorPolicy: requiredText(data, "colorPolicy"),
            preparationGuide: requiredText(data, "filePreparationGuide"),
            confirmed: data.get("filePolicyConfirmed") === "true",
          },
          session.user.id,
        );
      })();
      success = "Política de arquivo atualizada.";
    } else if (section === "production") {
      const fulfillmentOptions: Array<"PICKUP" | "SHIPPING"> = [];
      if (data.get("pickupEnabled") === "true") fulfillmentOptions.push("PICKUP");
      if (data.get("shippingEnabled") === "true") fulfillmentOptions.push("SHIPPING");
      products.replaceProductionSettings(
        productId,
        {
          equipment: parseEquipment(data),
          standardStartWithinBusinessHours: requiredPositiveInteger(
            data,
            "standardStartWithinBusinessHours",
          ),
          customLeadTimeAboveMeters: requiredPositiveInteger(
            data,
            "customLeadTimeAboveMeters",
          ),
          fulfillmentOptions,
        },
        session.user.id,
      );
      success = "Equipamentos e política de produção atualizados.";
    } else if (section === "payment") {
      products.updatePaymentPolicy(
        productId,
        {
          pixExpirationMinutes: requiredPositiveInteger(
            data,
            "pixExpirationMinutes",
            5,
          ),
          refundPolicy: requiredText(data, "refundPolicy"),
        },
        session.user.id,
      );
      success = "Política de Pix e reembolso atualizada.";
    } else if (section === "media") {
      const mainImageUrl = String(data.get("coverImageUrl") ?? "").trim() || null;
      const gallery = indexedFormEntries(data, "media", "url")
        .map((index, position) => ({
          id: current.gallery[index]?.id ?? `media_${randomUUID()}`,
          url: String(data.get(`media[${index}][url]`) ?? "").trim(),
          alt: String(data.get(`media[${index}][alt]`) ?? "").trim(),
          position,
        }))
        .filter((media) => media.url && media.alt);
      const coverImageAlt = String(data.get("coverImageAlt") ?? "").trim();
      if (
        mainImageUrl &&
        coverImageAlt &&
        !gallery.some((media) => media.url === mainImageUrl)
      ) {
        gallery.unshift({
          id: `media_${randomUUID()}`,
          url: mainImageUrl,
          alt: coverImageAlt,
          position: 0,
        });
      }
      products.updateProduct(
        productId,
        { mainImageUrl, gallery },
        session.user.id,
      );
    } else if (section === "seo") {
      products.updateProduct(
        productId,
        {
          seo: {
            title: requiredText(data, "seoTitle"),
            description: requiredText(data, "seoDescription"),
            canonicalPath: requiredText(data, "canonicalUrl"),
            socialImageUrl:
              String(data.get("socialImageUrl") ?? "").trim() || null,
          },
        },
        session.user.id,
      );
    } else {
      throw new Error(
        "Esta seção ainda não possui uma operação de gravação segura no repositório.",
      );
    }
    if (current.status === "PUBLISHED") {
      const updated = products.getDtfAggregate(productId);
      if (!updated) throw new Error("Produto DTF não encontrado.");
      const checklist = validateDtfProductForPublication(updated);
      if (!checklist.canPublish) throw new PublicationValidationError(checklist);
    }
    });
    saveSection();
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  if (failure) redirect(productUrl(productId, "erro", failure));
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${productId}`);
  redirect(productUrl(productId, "sucesso", success));
}

export async function productEditorAction(
  action: ProductEditorAction,
  productId: string,
) {
  const session = await requireStaff(["ADMIN"]);
  const db = openDatabase();
  let failure: string | null = null;
  let destination = `/admin/produtos/${productId}`;
  let success = "Ação concluída.";

  try {
    const products = new ProductRepository(db);
    if (action === "publish") {
      products.publishProduct(productId, session.user.id);
      success = "Produto publicado.";
    } else if (action === "publish-price-table") {
      const aggregate = products.getDtfAggregate(productId);
      const draft = aggregate?.priceTables
        .filter((table) => table.status === "DRAFT")
        .sort((left, right) => right.version - left.version)[0];
      if (!draft) throw new Error("Não há uma tabela de preços em rascunho.");
      const published = products.publishPriceTable(draft.id, {
        actorId: session.user.id,
      });
      success =
        published.validFrom && published.validFrom > new Date().toISOString()
          ? "Nova tabela agendada para a vigência informada."
          : "Nova tabela de preços publicada.";
    } else if (action === "archive") {
      products.archiveProduct(productId, session.user.id);
      success = "Produto arquivado.";
    } else if (action === "duplicate") {
      const source = products.findById(productId);
      if (!source) throw new Error("Produto não encontrado.");
      const suffix = Date.now().toString(36).slice(-6);
      const duplicate = products.duplicateProduct(
        productId,
        {
          code: `${source.code}-COPY-${suffix}`,
          name: `${source.name} (cópia)`,
          slug: `${source.slug.replace(/\/$/, "")}-copia-${suffix}`,
          featured: false,
        },
        session.user.id,
      );
      destination = `/admin/produtos/${duplicate.product.id}`;
      success = "Produto duplicado como rascunho.";
    } else if (action === "add-price-tier" || action === "add-specification" || action === "add-equipment" || action === "add-media") {
      throw new Error("Adicione o novo item na seção aberta e salve as alterações.");
    } else {
      throw new Error(
        "Esta inclusão depende de uma assinatura de atualização ainda não disponível.",
      );
    }
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  if (failure) redirect(productUrl(productId, "erro", failure));
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath(destination);
  redirect(`${destination}?sucesso=${encodeURIComponent(success)}`);
}

export async function createDtfProductFromTemplateAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const code = requiredText(data, "code").toUpperCase();
  const name = requiredText(data, "name");
  const slug = requiredText(data, "slug");

  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) {
    redirect(
      `/admin/produtos/novo?erro=${encodeURIComponent("Use de 3 a 64 letras, números, hífen ou sublinhado no código.")}`,
    );
  }
  if (!/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(slug)) {
    redirect(
      `/admin/produtos/novo?erro=${encodeURIComponent("Use um slug como /dtf/nome-do-produto.")}`,
    );
  }

  const db = openDatabase();
  let createdId: string | null = null;
  let failure: string | null = null;
  try {
    const products = new ProductRepository(db);
    const template = products
      .list({ type: "DTF_BY_METER" })
      .find((product) => product.status !== "ARCHIVED");
    if (!template) throw new Error("Nenhum produto DTF está disponível como modelo.");
    createdId = products.duplicateProduct(
      template.id,
      { code, name, slug, featured: false },
      session.user.id,
    ).product.id;
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  if (failure || !createdId) {
    redirect(
      `/admin/produtos/novo?erro=${encodeURIComponent(failure ?? "Não foi possível criar o produto.")}`,
    );
  }
  revalidatePath("/admin/produtos");
  redirect(
    `/admin/produtos/${createdId}?sucesso=${encodeURIComponent("Produto criado como rascunho independente.")}`,
  );
}

export async function createStandardProductAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const code = requiredText(data, "code").toUpperCase();
  const slugPart = requiredText(data, "slug");
  const destination = "/admin/produtos/novo?tipo=padrao";
  let createdId: string | null = null;
  let failure: string | null = null;

  try {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) throw new Error("Use um código de 3 a 64 letras, números, hífen ou sublinhado.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugPart)) throw new Error("Use uma URL curta com letras minúsculas, números e hífens.");
    const options = indexedFormEntries(data, "options", "name").map((index) => ({
      name: String(data.get(`options[${index}][name]`) ?? "").trim(),
      values: String(data.get(`options[${index}][values]`) ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    })).filter((option) => option.name && option.values.length > 0);
    const variants = indexedFormEntries(data, "variants", "sku").map((index) => {
      let optionValues: Record<string, string>;
      try {
        optionValues = JSON.parse(requiredText(data, `variants[${index}][options]`)) as Record<string, string>;
      } catch {
        throw new Error("A combinação de uma variante é inválida.");
      }
      const stockMode = requiredText(data, `variants[${index}][stockMode]`);
      if (stockMode !== "TRACKED" && stockMode !== "MADE_TO_ORDER") throw new Error("Modo de estoque inválido.");
      return {
        sku: requiredText(data, `variants[${index}][sku]`).toUpperCase(),
        optionValues,
        basePriceCents: requiredMoneyCents(data, `variants[${index}][price]`),
        minimumQuantity: requiredPositiveInteger(data, "minimumQuantity"),
        quantityIncrement: requiredPositiveInteger(data, "quantityIncrement"),
        stockMode: stockMode as "TRACKED" | "MADE_TO_ORDER",
        availableQuantity: stockMode === "TRACKED" ? Number(data.get(`variants[${index}][stock]`) ?? 0) : null,
        weightGrams: Math.round(optionalNonNegativeNumber(data, `variants[${index}][weight]`)),
        widthCm: optionalNonNegativeNumber(data, `variants[${index}][width]`),
        heightCm: optionalNonNegativeNumber(data, `variants[${index}][height]`),
        lengthCm: optionalNonNegativeNumber(data, `variants[${index}][length]`),
        active: true,
      };
    });
    const personalizationMode = requiredText(data, "personalizationMode");
    if (!["NONE", "STRUCTURED_FIELDS", "ARTWORK_UPLOAD"].includes(personalizationMode)) throw new Error("Modo de personalização inválido.");
    const personalizationFields = indexedFormEntries(data, "fields", "key").map((index, position) => {
      const type = requiredText(data, `fields[${index}][type]`);
      if (!["TEXT", "LONG_TEXT", "SELECT", "NUMBER", "COLOR", "NOTE"].includes(type)) throw new Error("Tipo de campo de personalização inválido.");
      const price = String(data.get(`fields[${index}][price]`) ?? "0").trim();
      return {
        key: requiredText(data, `fields[${index}][key]`),
        label: requiredText(data, `fields[${index}][label]`),
        type: type as "TEXT" | "LONG_TEXT" | "SELECT" | "NUMBER" | "COLOR" | "NOTE",
        required: data.get(`fields[${index}][required]`) === "true",
        options: String(data.get(`fields[${index}][options]`) ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        maximumLength: type === "TEXT" || type === "LONG_TEXT" ? 240 : null,
        priceAdjustmentCents: price ? Math.round(Number(price.replace(",", ".")) * 100) : 0,
        position,
      };
    });
    const fulfillmentOptions: Array<"PICKUP" | "SHIPPING"> = [];
    if (data.get("pickupEnabled") === "true") fulfillmentOptions.push("PICKUP");
    if (data.get("shippingEnabled") === "true") fulfillmentOptions.push("SHIPPING");
    if (!fulfillmentOptions.length) throw new Error("Selecione retirada ou entrega.");
    const mainImageUrl = String(data.get("mainImageUrl") ?? "").trim() || null;
    if (mainImageUrl && !mainImageUrl.startsWith("/images/") && !mainImageUrl.startsWith("https://")) throw new Error("A imagem deve usar /images/ ou uma URL HTTPS.");
    const mainImageAlt = String(data.get("mainImageAlt") ?? "").trim();
    if (mainImageUrl && !mainImageAlt) throw new Error("Informe o texto alternativo da imagem principal.");
    const categoryId = requiredText(data, "categoryId");
    const db = openDatabase();
    try {
      const commerce = new CommerceRepository(db);
      const aggregate = commerce.createStandardProduct({
        product: {
          code,
          name: requiredText(data, "name"),
          slug: `/produtos/${slugPart}`,
          summary: requiredText(data, "summary"),
          description: requiredText(data, "description"),
          featured: false,
          displayOrder: 20,
          paymentMethods: ["PIX", "CREDIT_CARD"],
          fulfillmentOptions,
          mainImageUrl,
          gallery: mainImageUrl ? [{ id: `media_${randomUUID()}`, url: mainImageUrl, alt: mainImageAlt, position: 0 }] : [],
          seo: {
            title: requiredText(data, "seoTitle"),
            description: requiredText(data, "seoDescription"),
            canonicalPath: `/produtos/${slugPart}`,
            socialImageUrl: mainImageUrl,
          },
        },
        configuration: {
          minimumQuantity: requiredPositiveInteger(data, "minimumQuantity"),
          quantityIncrement: requiredPositiveInteger(data, "quantityIncrement"),
          personalizationMode: personalizationMode as "NONE" | "STRUCTURED_FIELDS" | "ARTWORK_UPLOAD",
          reviewRequired: data.get("reviewRequired") === "true",
          leadTimeBusinessDays: requiredPositiveInteger(data, "leadTimeBusinessDays", 0),
          fulfillmentOptions,
        },
        categoryIds: [categoryId],
        primaryCategoryId: categoryId,
        options,
        variants,
        personalizationFields,
      }, session.user.id);
      createdId = aggregate.product.id;
    } finally {
      db.close();
    }
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure || !createdId) redirect(`${destination}&erro=${encodeURIComponent(failure ?? "Não foi possível criar o produto.")}`);
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect(`/admin/produtos/${createdId}?sucesso=${encodeURIComponent("Produto padrão criado como rascunho.")}`);
}

export async function updateStandardProductAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const slugPart = requiredText(data, "slug");
  let failure: string | null = null;
  let previousSlug: string | null = null;

  try {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugPart)) {
      throw new Error("Use uma URL curta com letras minúsculas, números e hífens.");
    }
    const options = indexedFormEntries(data, "options", "name").map((index) => ({
      name: String(data.get(`options[${index}][name]`) ?? "").trim(),
      values: String(data.get(`options[${index}][values]`) ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    })).filter((option) => option.name && option.values.length > 0);
    const variants = indexedFormEntries(data, "variants", "sku").map((index) => {
      let optionValues: Record<string, string>;
      try {
        optionValues = JSON.parse(requiredText(data, `variants[${index}][options]`)) as Record<string, string>;
      } catch {
        throw new Error("A combinação de uma variante é inválida.");
      }
      const stockMode = requiredText(data, `variants[${index}][stockMode]`);
      if (stockMode !== "TRACKED" && stockMode !== "MADE_TO_ORDER") throw new Error("Modo de estoque inválido.");
      const id = String(data.get(`variants[${index}][id]`) ?? "").trim() || undefined;
      return {
        id,
        sku: requiredText(data, `variants[${index}][sku]`).toUpperCase(),
        optionValues,
        basePriceCents: id ? undefined : requiredMoneyCents(data, `variants[${index}][price]`),
        minimumQuantity: requiredPositiveInteger(data, `variants[${index}][minimumQuantity]`),
        quantityIncrement: requiredPositiveInteger(data, `variants[${index}][quantityIncrement]`),
        stockMode: stockMode as "TRACKED" | "MADE_TO_ORDER",
        availableQuantity: stockMode === "TRACKED"
          ? Number(data.get(`variants[${index}][stock]`) ?? 0)
          : null,
        weightGrams: Math.round(optionalNonNegativeNumber(data, `variants[${index}][weight]`)),
        widthCm: optionalNonNegativeNumber(data, `variants[${index}][width]`),
        heightCm: optionalNonNegativeNumber(data, `variants[${index}][height]`),
        lengthCm: optionalNonNegativeNumber(data, `variants[${index}][length]`),
        active: data.get(`variants[${index}][active]`) === "true",
      };
    });
    const personalizationMode = requiredText(data, "personalizationMode");
    if (!["NONE", "STRUCTURED_FIELDS", "ARTWORK_UPLOAD"].includes(personalizationMode)) {
      throw new Error("Modo de personalização inválido.");
    }
    const personalizationFields = indexedFormEntries(data, "fields", "key").map((index, position) => {
      const type = requiredText(data, `fields[${index}][type]`);
      if (!["TEXT", "LONG_TEXT", "SELECT", "NUMBER", "COLOR", "NOTE"].includes(type)) {
        throw new Error("Tipo de campo de personalização inválido.");
      }
      const price = String(data.get(`fields[${index}][price]`) ?? "0").trim();
      const maximumLength = String(data.get(`fields[${index}][maximumLength]`) ?? "").trim();
      return {
        key: requiredText(data, `fields[${index}][key]`),
        label: requiredText(data, `fields[${index}][label]`),
        type: type as "TEXT" | "LONG_TEXT" | "SELECT" | "NUMBER" | "COLOR" | "NOTE",
        required: data.get(`fields[${index}][required]`) === "true",
        options: String(data.get(`fields[${index}][options]`) ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        maximumLength: maximumLength ? requiredPositiveInteger(data, `fields[${index}][maximumLength]`) : null,
        priceAdjustmentCents: price ? Math.round(Number(price.replace(",", ".")) * 100) : 0,
        position,
      };
    });
    if (personalizationFields.some((field) => !Number.isInteger(field.priceAdjustmentCents) || field.priceAdjustmentCents < 0)) {
      throw new Error("O acréscimo da personalização precisa ser um valor válido.");
    }
    const fulfillmentOptions: Array<"PICKUP" | "SHIPPING"> = [];
    if (data.get("pickupEnabled") === "true") fulfillmentOptions.push("PICKUP");
    if (data.get("shippingEnabled") === "true") fulfillmentOptions.push("SHIPPING");
    const mainImageUrl = String(data.get("mainImageUrl") ?? "").trim() || null;
    if (mainImageUrl && !mainImageUrl.startsWith("/images/") && !mainImageUrl.startsWith("https://")) {
      throw new Error("A imagem deve usar /images/ ou uma URL HTTPS.");
    }
    const gallery = indexedFormEntries(data, "gallery", "url").map((index, position) => ({
      id: String(data.get(`gallery[${index}][id]`) ?? "").trim() || `media_${randomUUID()}`,
      url: requiredText(data, `gallery[${index}][url]`),
      alt: requiredText(data, `gallery[${index}][alt]`),
      position,
    }));
    const mainImageAlt = String(data.get("mainImageAlt") ?? "").trim();
    if (mainImageUrl && !mainImageAlt) {
      throw new Error("Informe o texto alternativo da imagem principal.");
    }
    if (mainImageUrl) {
      const mainInGallery = gallery.find((media) => media.url === mainImageUrl);
      if (mainInGallery) mainInGallery.alt = mainImageAlt;
      else gallery.unshift({ id: `media_${randomUUID()}`, url: mainImageUrl, alt: mainImageAlt, position: 0 });
    }
    const normalizedGallery = gallery.map((media, position) => ({ ...media, position }));
    const categoryId = requiredText(data, "categoryId");
    const db = openDatabase();
    try {
      const commerce = new CommerceRepository(db);
      const current = commerce.getStandardProduct(productId);
      if (!current) throw new Error("Produto padrão não encontrado.");
      previousSlug = current.product.slug;
      commerce.updateStandardProduct(productId, {
        product: {
          name: requiredText(data, "name"),
          slug: `/produtos/${slugPart}`,
          summary: requiredText(data, "summary"),
          description: requiredText(data, "description"),
          featured: data.get("featured") === "true",
          displayOrder: Number(data.get("displayOrder") ?? 20),
          fulfillmentOptions,
          mainImageUrl,
          gallery: normalizedGallery,
          seo: {
            title: requiredText(data, "seoTitle"),
            description: requiredText(data, "seoDescription"),
            canonicalPath: `/produtos/${slugPart}`,
            socialImageUrl: String(data.get("socialImageUrl") ?? "").trim() || mainImageUrl,
          },
        },
        configuration: {
          minimumQuantity: requiredPositiveInteger(data, "minimumQuantity"),
          quantityIncrement: requiredPositiveInteger(data, "quantityIncrement"),
          personalizationMode: personalizationMode as "NONE" | "STRUCTURED_FIELDS" | "ARTWORK_UPLOAD",
          reviewRequired: data.get("reviewRequired") === "true",
          leadTimeBusinessDays: requiredPositiveInteger(data, "leadTimeBusinessDays", 0),
          fulfillmentOptions,
        },
        categoryIds: [categoryId],
        primaryCategoryId: categoryId,
        options,
        variants,
        personalizationFields,
      }, session.user.id);
    } finally {
      db.close();
    }
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(`/admin/produtos/${productId}?erro=${encodeURIComponent(failure)}`);
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  if (previousSlug) revalidatePath(previousSlug);
  revalidatePath(`/produtos/${slugPart}`);
  redirect(`/admin/produtos/${productId}?sucesso=${encodeURIComponent("Cadastro comercial atualizado.")}`);
}

export async function publishStandardProductAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const db = openDatabase();
  let failure: string | null = null;
  try {
    new CommerceRepository(db).publishStandardProduct(productId, session.user.id);
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }
  if (failure) redirect(`/admin/produtos/${productId}?erro=${encodeURIComponent(failure)}`);
  revalidatePath("/produtos");
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${productId}?sucesso=${encodeURIComponent("Produto publicado no catálogo.")}`);
}

export async function archiveStandardProductAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const db = openDatabase();
  let failure: string | null = null;
  try {
    new ProductRepository(db).archiveProduct(productId, session.user.id);
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }
  if (failure) redirect(`/admin/produtos/${productId}?erro=${encodeURIComponent(failure)}`);
  revalidatePath("/produtos");
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${productId}?sucesso=${encodeURIComponent("Produto arquivado e removido de novas compras.")}`);
}

export async function adjustVariantInventoryAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const variantId = requiredText(data, "variantId");
  const delta = Number(requiredText(data, "delta"));
  const db = openDatabase();
  let failure: string | null = null;
  try {
    new CommerceRepository(db).adjustInventory(variantId, delta, requiredText(data, "reason"), session.user.id);
  } catch (error) {
    failure = errorMessage(error);
  } finally { db.close(); }
  if (failure) redirect(`/admin/produtos/${productId}?erro=${encodeURIComponent(failure)}`);
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/produtos");
  redirect(`/admin/produtos/${productId}?sucesso=${encodeURIComponent("Estoque atualizado.")}`);
}

export async function createVariantPriceVersionAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const productId = requiredText(data, "productId");
  const variantId = requiredText(data, "variantId");
  const tiers = indexedFormEntries(data, "tiers", "minimum")
    .filter((index) => String(data.get(`tiers[${index}][minimum]`) ?? "").trim() || String(data.get(`tiers[${index}][price]`) ?? "").trim())
    .map((index) => ({
      minimumQuantity: requiredPositiveInteger(data, `tiers[${index}][minimum]`),
      unitPriceCents: requiredMoneyCents(data, `tiers[${index}][price]`),
    }));
  const validFrom = optionalBrazilDateTime(data, "validFrom");
  const db = openDatabase();
  let failure: string | null = null;
  try {
    const commerce = new CommerceRepository(db);
    const table = commerce.createVariantPriceTableVersion(variantId, tiers, session.user.id, validFrom);
    commerce.publishVariantPriceTable(table.id, session.user.id);
  } catch (error) {
    failure = errorMessage(error);
  } finally { db.close(); }
  if (failure) redirect(`/admin/produtos/${productId}?erro=${encodeURIComponent(failure)}`);
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/produtos");
  redirect(`/admin/produtos/${productId}?sucesso=${encodeURIComponent("Nova versão de preço publicada.")}`);
}

export async function createCategoryAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const db = openDatabase();
  let failure: string | null = null;
  try {
    const slug = requiredText(data, "slug");
    new CommerceRepository(db).createCategory({
      name: requiredText(data, "name"),
      slug,
      description: requiredText(data, "description"),
      imageUrl: String(data.get("imageUrl") ?? "").trim() || null,
      seo: {
        title: requiredText(data, "seoTitle"),
        description: requiredText(data, "seoDescription"),
        canonicalPath: `/categorias/${slug}`,
        socialImageUrl: String(data.get("imageUrl") ?? "").trim() || null,
      },
      displayOrder: Number(data.get("displayOrder") ?? 0),
      status: data.get("published") === "true" ? "PUBLISHED" : "DRAFT",
    }, session.user.id);
  } catch (error) { failure = errorMessage(error); } finally { db.close(); }
  if (failure) redirect(`/admin/categorias?erro=${encodeURIComponent(failure)}`);
  revalidatePath("/admin/categorias"); revalidatePath("/produtos");
  redirect(`/admin/categorias?sucesso=${encodeURIComponent("Categoria cadastrada.")}`);
}

export async function publishCategoryAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const db = openDatabase();
  let failure: string | null = null;
  try {
    new CommerceRepository(db).publishCategory(requiredText(data, "categoryId"), session.user.id);
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }
  if (failure) redirect(`/admin/categorias?erro=${encodeURIComponent(failure)}`);
  revalidatePath("/admin/categorias");
  revalidatePath("/produtos");
  revalidatePath("/categorias");
  redirect(`/admin/categorias?sucesso=${encodeURIComponent("Categoria publicada.")}`);
}

export async function saveCommerceSettingsAction(data: FormData) {
  const session = await requireStaff(["ADMIN"]);
  const db = openDatabase();
  let failure: string | null = null;
  try {
    const settings = {
      catalogEnabled: data.get("catalogEnabled") === "true",
      directCheckoutEnabled: data.get("directCheckoutEnabled") === "true",
      cardEnabled: data.get("cardEnabled") === "true",
      shippingEnabled: data.get("shippingEnabled") === "true",
      maxInstallments: requiredPositiveInteger(data, "maxInstallments"),
      statementDescriptor: requiredText(data, "statementDescriptor").toUpperCase(),
    };
    await getCommercePaymentGateway().updateSettings({
      maxInstallments: settings.maxInstallments,
      statementDescriptor: settings.statementDescriptor,
      cardEnabled: settings.cardEnabled,
    });
    new CommerceRepository(db).updateSettings(settings, session.user.id);
  } catch (error) { failure = errorMessage(error); } finally { db.close(); }
  if (failure) redirect(`/admin/integracoes?erro=${encodeURIComponent(failure)}`);
  revalidatePath("/admin/integracoes"); revalidatePath("/produtos"); revalidatePath("/carrinho");
  redirect(`/admin/integracoes?sucesso=${encodeURIComponent("Configurações comerciais atualizadas.")}`);
}

const correctionCategoryLabels: Record<string, string> = {
  DIMENSIONS: "Dimensões ou proporção",
  RESOLUTION: "Resolução insuficiente",
  TRANSPARENCY: "Fundo ou transparência",
  COLORS: "Cores ou perfil",
  FONTS: "Fontes ou textos",
  OTHER: "Outro ajuste",
};

export async function reviewArtworkAction(data: FormData) {
  const session = await requireStaff(["OPERATOR", "ADMIN"]);
  const versionId = requiredText(data, "versionId");
  const orderId = requiredText(data, "orderId");
  const decision = requiredText(data, "decision");
  const category = String(data.get("category") ?? "").trim();
  const comment = String(data.get("comment") ?? "").trim();
  const referenceUrlInput = String(data.get("referenceUrl") ?? "").trim();
  let failure: string | null = null;

  const db = openDatabase();
  try {
    const artwork = new ArtworkVersionRepository(db);
    const orders = new OrderRepository(db);
    const version = artwork.findById(versionId);
    if (!version || version.orderId !== orderId) {
      throw new Error("Versão da arte não encontrada para este pedido.");
    }
    const latest = artwork.listForOrder(orderId)[0];
    if (!latest || latest.id !== versionId) {
      throw new Error("Somente a versão mais recente pode ser revisada.");
    }
    const order = orders.findById(orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.paymentStatus !== "PAID") {
      throw new Error("A revisão humana exige o Pix confirmado.");
    }
    if (
      !isArtworkReadyForHumanReview(version) ||
      !["PASSED", "WARNING"].includes(version.preflightStatus)
    ) {
      throw new Error("A arte precisa passar pelas validações mínimas antes da revisão.");
    }
    let referenceUrl: string | null = null;
    if (referenceUrlInput) {
      if (referenceUrlInput.length > 2048) {
        throw new Error("A URL de referência é muito longa.");
      }
      try {
        const parsedReference = new URL(referenceUrlInput);
        const localHttp =
          process.env.NODE_ENV !== "production" &&
          parsedReference.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsedReference.hostname);
        if (parsedReference.protocol !== "https:" && !localHttp) {
          throw new Error();
        }
        referenceUrl = parsedReference.toString();
      } catch {
        throw new Error("Informe uma URL de referência HTTPS válida.");
      }
    }
    if (decision === "APPROVED") {
      artwork.review(versionId, "APPROVED", comment || null, session.user.id);
      const threshold =
        new ProductRepository(db).getDtfAggregate(order.productId)?.productionPolicy
          ?.customLeadTimeAboveMeters ?? 100;
      if (order.quantityMeters <= threshold) {
        db.transaction(() => {
          orders.releaseApprovedItems(order.id, session.user.id);
          const blocked = db.prepare(
            "SELECT 1 FROM order_items WHERE order_id = ? AND production_status = 'BLOCKED' LIMIT 1",
          ).get(order.id);
          const refreshed = orders.findById(order.id);
          if (!blocked && refreshed?.artworkStatus === "APPROVED") {
            orders.updateStatuses(order.id, { productionStatus: "QUEUED" }, session.user.id);
          }
        })();
      }
    } else if (decision === "CHANGES_REQUESTED") {
      if (!category || !correctionCategoryLabels[category]) {
        throw new Error("Selecione o motivo da correção.");
      }
      if (!comment) throw new Error("Explique a alteração necessária.");
      artwork.review(
        versionId,
        "CHANGES_REQUESTED",
        `${correctionCategoryLabels[category]}: ${comment}`,
        session.user.id,
        referenceUrl ? { correctionReferenceUrl: referenceUrl } : {},
      );
    } else {
      throw new Error("Decisão de revisão inválida.");
    }
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  if (failure) {
    redirect(`/admin/artes/${versionId}?erro=${encodeURIComponent(failure)}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/artes");
  revalidatePath(`/admin/artes/${versionId}`);
  revalidatePath(`/admin/pedidos/${orderId}`);
  redirect(
    `/admin/artes/${versionId}?sucesso=${encodeURIComponent("Revisão registrada.")}`,
  );
}

export async function updateOrderWorkflowAction(data: FormData) {
  const session = await requireStaff(["OPERATOR", "ADMIN"]);
  const orderId = requiredText(data, "orderId");
  const command = requiredText(data, "command");
  const manualLeadTimeNote = String(data.get("manualLeadTimeNote") ?? "").trim();
  const db = openDatabase();
  let failure: string | null = null;

  try {
    const orders = new OrderRepository(db);
    const products = new ProductRepository(db);
    const order = orders.findById(orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    const largeOrderThreshold =
      products.getDtfAggregate(order.productId)?.productionPolicy
        ?.customLeadTimeAboveMeters ?? 100;

    if (command === "APPROVE_PERSONALIZATION") {
      if (order.artworkStatus !== "PENDING_REVIEW") {
        throw new Error("A personalização deste pedido não está aguardando revisão.");
      }
      orders.approveStructuredPersonalizations(order.id, session.user.id);
    } else if (command === "QUEUE") {
      if (order.productionStatus !== "BLOCKED") {
        throw new Error("Somente um pedido bloqueado pode entrar na fila.");
      }
      if (order.paymentStatus !== "PAID" || order.artworkStatus !== "APPROVED") {
        throw new Error("A fila exige Pix confirmado e arte aprovada.");
      }
      db.transaction(() => {
        orders.transitionItemProduction(order.id, "BLOCKED", "QUEUED", session.user.id);
        orders.updateStatuses(
          order.id,
          {
            productionStatus: "QUEUED",
            manualLeadTimeNote:
              order.quantityMeters > largeOrderThreshold
                ? manualLeadTimeNote || null
                : order.manualLeadTimeNote,
          },
          session.user.id,
        );
      })();
    } else if (command === "START") {
      if (order.productionStatus !== "QUEUED") {
        throw new Error("Somente um pedido na fila pode iniciar a produção.");
      }
      db.transaction(() => {
        orders.transitionItemProduction(order.id, "QUEUED", "IN_PRODUCTION", session.user.id);
        orders.updateStatuses(order.id, { productionStatus: "IN_PRODUCTION" }, session.user.id);
      })();
    } else if (command === "READY") {
      if (order.productionStatus !== "IN_PRODUCTION") {
        throw new Error("Somente um pedido em produção pode ficar pronto.");
      }
      db.transaction(() => {
        orders.transitionItemProduction(order.id, "IN_PRODUCTION", "READY", session.user.id);
        const fulfillmentStatus = order.fulfillmentMethod === "PICKUP"
          ? "READY_FOR_PICKUP"
          : order.fulfillmentStatus;
        orders.updateStatuses(
          order.id,
          { productionStatus: "READY", fulfillmentStatus },
          session.user.id,
        );
        if (order.fulfillmentMethod === "PICKUP") {
          db.prepare("UPDATE fulfillments SET status = 'READY_FOR_PICKUP', updated_at = ? WHERE order_id = ?")
            .run(new Date().toISOString(), order.id);
        }
      })();
    } else if (command === "PICKED_UP") {
      if (
        order.fulfillmentMethod !== "PICKUP" ||
        order.productionStatus !== "READY" ||
        order.fulfillmentStatus !== "READY_FOR_PICKUP"
      ) {
        throw new Error("O pedido ainda não está pronto para retirada.");
      }
      db.transaction(() => {
        orders.transitionItemProduction(order.id, "READY", "COMPLETED", session.user.id);
        orders.updateStatuses(
          order.id,
          { productionStatus: "COMPLETED", fulfillmentStatus: "PICKED_UP" },
          session.user.id,
        );
        db.prepare("UPDATE fulfillments SET status = 'PICKED_UP', updated_at = ? WHERE order_id = ?")
          .run(new Date().toISOString(), order.id);
      })();
    } else if (command === "SHIPPED") {
      if (order.fulfillmentMethod !== "SHIPPING" || order.productionStatus !== "READY") {
        throw new Error("Somente um pedido de entrega pronto pode ser enviado.");
      }
      db.transaction(() => {
        orders.updateStatuses(order.id, { fulfillmentStatus: "SHIPPED" }, session.user.id);
        db.prepare("UPDATE fulfillments SET status = 'SHIPPED', updated_at = ? WHERE order_id = ?")
          .run(new Date().toISOString(), order.id);
      })();
    } else if (command === "DELIVERED") {
      if (order.fulfillmentMethod !== "SHIPPING" || order.fulfillmentStatus !== "SHIPPED") {
        throw new Error("Somente um pedido enviado pode ser marcado como entregue.");
      }
      db.transaction(() => {
        orders.transitionItemProduction(order.id, "READY", "COMPLETED", session.user.id);
        orders.updateStatuses(
          order.id,
          { productionStatus: "COMPLETED", fulfillmentStatus: "DELIVERED" },
          session.user.id,
        );
        db.prepare("UPDATE fulfillments SET status = 'DELIVERED', updated_at = ? WHERE order_id = ?")
          .run(new Date().toISOString(), order.id);
      })();
    } else if (command === "CANCEL") {
      if (order.productionStatus === "COMPLETED") {
        throw new Error("Um pedido concluído não pode ser cancelado.");
      }
      if (order.paymentStatus === "PAID") {
        throw new Error(
          "Registre o reembolso antes de cancelar um pedido que já foi pago.",
        );
      }
      orders.updateStatuses(
        order.id,
        { productionStatus: "CANCELLED" },
        session.user.id,
      );
    } else {
      throw new Error("Comando operacional inválido.");
    }
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  redirect(
    `/admin/pedidos/${orderId}?${failure ? "erro" : "sucesso"}=${encodeURIComponent(failure ?? "Fluxo operacional atualizado.")}`,
  );
}

export async function refundPaymentAction(data: FormData) {
  const session = await requireStaff(["FINANCE", "ADMIN"]);
  const orderId = requiredText(data, "orderId");
  if (data.get("confirmRefund") !== "true") {
    redirect(
      `/admin/pedidos/${orderId}?erro=${encodeURIComponent("Confirme o reembolso antes de continuar.")}`,
    );
  }
  const db = openDatabase();
  let failure: string | null = null;

  try {
    const orders = new OrderRepository(db);
    const order = orders.findById(orderId);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.paymentStatus !== "PAID") {
      throw new Error("Somente um Pix confirmado pode ser reembolsado.");
    }
    if (!["BLOCKED", "QUEUED"].includes(order.productionStatus)) {
      throw new Error(
        "A produção já começou. O reembolso exige análise operacional manual.",
      );
    }
    const payments = new PaymentAttemptRepository(db);
    const attempt = payments
      .listForOrder(order.id)
      .find((candidate) => candidate.status === "PAID");
    if (!attempt) throw new Error("Tentativa de pagamento paga não encontrada.");

    if (order.productionStatus === "QUEUED") {
      orders.updateStatuses(
        order.id,
        { productionStatus: "BLOCKED" },
        session.user.id,
      );
    }

    const gateway = getPaymentGateway();
    const refund = await gateway.refund({
      externalId: attempt.providerReference,
      amountMinor: attempt.amountCents,
      idempotencyKey: `payment:${attempt.id}:refund:full`,
    });
    payments.transition(attempt.id, "REFUNDED", session.user.id, {
      refundId: refund.refundId,
      refundedAt: new Date().toISOString(),
    });
  } catch (error) {
    failure = errorMessage(error);
  } finally {
    db.close();
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/pedidos/${orderId}`);
  redirect(
    `/admin/pedidos/${orderId}?${failure ? "erro" : "sucesso"}=${encodeURIComponent(failure ?? "Reembolso registrado.")}`,
  );
}

export async function adminLogoutAction() {
  await requireStaff(
    ["OPERATOR", "FINANCE", "ADMIN"],
    { allowWithoutMfa: true },
  );
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/entrar");
}
