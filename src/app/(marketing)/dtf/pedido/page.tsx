import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DtfOrderForm } from "@/components/checkout";
import { openDatabase, ProductRepository } from "@/server/db";
import { isProductOrderable } from "@/server/product-availability";

export const metadata: Metadata = {
  title: "Pedir DTF por metro",
  description: "Monte seu pedido de DTF por metro, envie a arte e confira o total antes do Pix.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ produto?: string; meters?: string }>;
};

export default async function DtfOrderPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const db = openDatabase();
  const products = new ProductRepository(db);
  const product = query.produto
    ? products.findById(query.produto)
    : products
        .list({ type: "DTF_BY_METER" })
        .find(
          (candidate) =>
            candidate.featured && isProductOrderable(candidate.status),
        );

  if (
    !product ||
    product.type !== "DTF_BY_METER" ||
    !isProductOrderable(product.status)
  ) {
    db.close();
    notFound();
  }

  const aggregate = products.getDtfAggregate(product.id);
  if (!aggregate) {
    db.close();
    notFound();
  }

  let activeTable;
  try {
    const quote = products.calculatePrice(product.id, aggregate.configuration.minimumMeters);
    activeTable = aggregate.priceTables.find((table) => table.id === quote.priceTableId);
  } catch {
    activeTable = undefined;
  }
  db.close();

  if (!activeTable) notFound();

  const requestedMeters = Number(query.meters);
  const initialMeters =
    Number.isInteger(requestedMeters) &&
    requestedMeters >= aggregate.configuration.minimumMeters &&
    (requestedMeters - aggregate.configuration.minimumMeters) %
      aggregate.configuration.meterIncrement ===
      0
      ? requestedMeters
      : aggregate.configuration.minimumMeters;

  const policyConfirmed = Boolean(aggregate.filePolicy?.confirmed);
  const acceptedExtensions = policyConfirmed
    ? aggregate.filePolicy?.acceptedExtensions ?? []
    : ["PNG", "PDF", "TIFF"];
  const maximumFileSizeMb = policyConfirmed
    ? aggregate.filePolicy?.maximumFileSizeMb ?? null
    : 10;
  const configuredStartHours =
    aggregate.productionPolicy?.standardStartWithinBusinessHours;
  const standardStartWithinBusinessHours =
    typeof configuredStartHours === "number" &&
    Number.isInteger(configuredStartHours) &&
    configuredStartHours > 0
      ? configuredStartHours
      : 24;
  const configuredThreshold =
    aggregate.productionPolicy?.customLeadTimeAboveMeters;
  const customLeadTimeAboveMeters =
    typeof configuredThreshold === "number" &&
    Number.isInteger(configuredThreshold) &&
    configuredThreshold > 0
      ? configuredThreshold
      : 100;

  return (
    <main id="conteudo" className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="mb-9 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-accent">
          Pedido DTF por metro
        </p>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
          Arquivo, dados e valor em uma única etapa
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          O preço é recalculado no servidor. O Pix só aparece depois da validação mínima do arquivo e da verificação do seu e-mail.
        </p>
      </div>

      {!policyConfirmed || product.status !== "PUBLISHED" ? (
        <section className="mb-7 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_38%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_9%,var(--surface))] p-5">
          <p className="font-bold text-foreground">Jornada em homologação</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Para testar o fluxo, aceitamos provisoriamente PNG, PDF e TIFF de até 10 MB. A largura útil, os formatos finais, o antimalware e as alegações técnicas ainda precisam ser confirmados antes da publicação.
          </p>
        </section>
      ) : null}

      <section className="mb-7 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
        Nesta versão, pedidos podem ser concluídos por <strong className="text-foreground">retirada no local</strong>. A entrega será habilitada quando o cálculo final de frete estiver integrado. Consulte também o{" "}
        <Link
          href="/dtf/guia-do-arquivo"
          className="font-bold text-foreground underline decoration-[var(--accent)] underline-offset-4"
        >
          guia provisório do arquivo
        </Link>
        .
      </section>

      <DtfOrderForm
        product={{
          id: product.id,
          name: product.name,
          minimumMeters: aggregate.configuration.minimumMeters,
          meterIncrement: aggregate.configuration.meterIncrement,
          printableWidthCm: aggregate.configuration.printableWidthCm,
          acceptedExtensions,
          maximumFileSizeMb,
          fulfillmentOptions: ["PICKUP"],
          standardStartWithinBusinessHours,
          customLeadTimeAboveMeters,
        }}
        priceTable={{
          id: activeTable.id,
          version: activeTable.version,
          tiers: activeTable.tiers.map((tier) => ({
            id: tier.id,
            minimumMeters: tier.minimumMeters,
            maximumExclusiveMeters: tier.maximumExclusiveMeters,
            unitPriceCents: tier.unitPriceCents,
          })),
        }}
        initialMeters={initialMeters}
      />
    </main>
  );
}
