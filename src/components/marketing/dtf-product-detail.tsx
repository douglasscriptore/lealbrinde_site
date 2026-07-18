import type { DtfProductAggregate, PriceTable } from "@/domain";

import { DtfProductPage } from "./dtf-product-page";
import { toMarketingPriceTiers } from "@/server/queries/dtf-products";

type DtfProductDetailProps = {
  aggregate: DtfProductAggregate;
  priceTable: PriceTable;
};

function formatQuantity(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildProductionNote(aggregate: DtfProductAggregate) {
  const policy = aggregate.productionPolicy;
  if (!policy) {
    return "O início da produção é confirmado depois do Pix e da aprovação da arte.";
  }

  const threshold = formatQuantity(
    policy.customLeadTimeAboveMeters,
    "metro",
    "metros",
  );
  const businessHours = formatQuantity(
    policy.standardStartWithinBusinessHours,
    "hora útil",
    "horas úteis",
  );

  return `Pedidos de até ${threshold} entram em produção em até ${businessHours} depois do Pix confirmado e da arte aprovada. Acima de ${threshold}, o prazo é combinado conforme a fila.`;
}

const productFaq = [
  {
    question: "Quando o Pix é gerado?",
    answer:
      "Depois que o arquivo passa pela validação automática mínima e o total é confirmado.",
  },
  {
    question: "Quem aprova a arte?",
    answer:
      "A equipe da Leal Brinde faz a revisão humana depois da confirmação do Pix.",
  },
  {
    question: "E se o arquivo precisar mudar?",
    answer:
      "Você recebe o motivo, envia uma nova versão e acompanha o histórico no pedido.",
  },
];

function structuredData(
  aggregate: DtfProductAggregate,
  priceTable: PriceTable,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const product = aggregate.product;
  const productUrl = new URL(product.slug, siteUrl).toString();
  const imageUrl = new URL(
    product.mainImageUrl ?? "/images/dtf-hero-campaign.png",
    siteUrl,
  ).toString();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#produto`,
        name: product.name,
        description: product.summary,
        image: [imageUrl],
        sku: product.code,
        url: productUrl,
        offers: priceTable.tiers.map((tier) => ({
          "@type": "Offer",
          price: (tier.unitPriceCents / 100).toFixed(2),
          priceCurrency: "BRL",
          url: `${productUrl}#calcular`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: (tier.unitPriceCents / 100).toFixed(2),
            priceCurrency: "BRL",
            unitText: "metro",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitText: "metro",
            },
          },
          eligibleQuantity: {
            "@type": "QuantitativeValue",
            minValue: tier.minimumMeters,
            ...(tier.maximumExclusiveMeters === null
              ? {}
              : { maxValue: tier.maximumExclusiveMeters - 1 }),
            unitText: "metro",
          },
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${productUrl}#duvidas`,
        mainEntity: productFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Início",
            item: new URL("/", siteUrl).toString(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: product.name,
            item: productUrl,
          },
        ],
      },
    ],
  };
}

export function DtfProductDetail({
  aggregate,
  priceTable,
}: DtfProductDetailProps) {
  const technicalSpecifications = aggregate.specifications.filter(
    (item) => item.visible && item.group !== "Diferenciais",
  );
  const differentiators = aggregate.specifications
    .filter((item) => item.visible && item.group === "Diferenciais")
    .map((item) => item.title);

  return (
    <>
      {aggregate.product.status === "PUBLISHED" ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(aggregate, priceTable)).replace(
              /</g,
              "\\u003c",
            ),
          }}
          type="application/ld+json"
        />
      ) : null}
      {aggregate.product.status !== "PUBLISHED" ? (
        <div
          role="status"
          className="border-b border-warning/30 bg-[color-mix(in_srgb,var(--warning)_10%,var(--background))] px-4 py-3 text-center text-sm font-semibold text-warning"
        >
          Prévia de homologação. Este produto ainda não está publicado.
        </div>
      ) : null}
      <DtfProductPage
        product={{
          name: aggregate.product.name,
          summary: aggregate.product.summary,
          description: aggregate.product.description,
          image: {
            src:
              aggregate.product.mainImageUrl ??
              "/images/dtf-hero-campaign.png",
            alt: `Materiais impressos para ${aggregate.product.name}`,
            priority: true,
          },
        }}
        pricing={{
          title: "Quanto maior a metragem, menor o valor",
          description:
            "Todos os metros usam o valor da faixa atingida. O total é recalculado no servidor antes do Pix.",
          tiers: toMarketingPriceTiers(priceTable),
          minimumMeters: aggregate.configuration.minimumMeters,
          meterIncrement: aggregate.configuration.meterIncrement,
          orderHref: `/dtf/pedido?produto=${aggregate.product.id}`,
        }}
        fileGuideAction={{
          label: "Preparar arquivo",
          href: "/dtf/guia-do-arquivo",
        }}
        specifications={{
          title: "Qualidade em cada camada",
          description:
            "Especificações fornecidas pelo cliente e mantidas em rascunho até a validação técnica final.",
          items: technicalSpecifications.map((item) => ({
            group: item.group,
            title: item.title,
            description: item.description,
            position: item.position,
            visible: item.visible,
          })),
        }}
        production={{
          title: "Capacidade para crescer",
          description:
            "A capacidade é nominal e não substitui a confirmação do prazo na fila de produção.",
          equipment: aggregate.equipment
            .filter((item) => item.active)
            .map((item) => ({
              quantity: item.quantity,
              name: item.name,
              metersPerHour: item.unitCapacityMetersPerHour,
            })),
          note: buildProductionNote(aggregate),
        }}
        differentiators={{
          title: "Produção que você acompanha",
          description:
            "A qualidade do material vem acompanhada de um processo claro para pagamento, revisão e entrega.",
          items:
            differentiators.length > 0
              ? differentiators
              : ["Produção própria", "Revisão humana", "Acompanhamento do pedido"],
        }}
        applicationNote={{
          title: "Aplicação correta faz parte do resultado",
          description:
            "Temperatura, tempo, pressão e resistência por lavagens só serão publicados depois da confirmação e dos testes da Leal Brinde.",
          action: {
            label: "Ver guia provisório",
            href: "/dtf/guia-do-arquivo",
          },
        }}
        faq={{
          title: "Dúvidas sobre o DTF",
          questions: productFaq,
        }}
        closing={{
          title: "Confira sua faixa agora",
          description:
            "O cálculo mostra o valor por metro e o total antes de qualquer pagamento.",
          primaryAction: { label: "Calcular pedido", href: "#calcular" },
          secondaryAction: {
            label: "Ver o processo",
            href: "/como-funciona",
          },
        }}
      />
    </>
  );
}
