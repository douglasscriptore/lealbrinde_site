import { MarketingHomeSections } from "@/components/marketing";
import { getFeaturedDtfProduct } from "@/server/queries/dtf-products";
import { getCatalog } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

function formatQuantity(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function HomePage() {
  const featured = getFeaturedDtfProduct();
  const catalog = getCatalog();
  const featuredProduct = featured?.aggregate.product;
  const productionPolicy = featured?.aggregate.productionPolicy;
  const productHref = featuredProduct?.slug ?? "/dtf/textil-por-metro";
  const calculatorHref = featuredProduct
    ? `${productHref}#calcular`
    : "/dtf/textil-por-metro#calcular";
  const equipment =
    featured?.aggregate.equipment.filter((item) => item.active).map((item) => ({
      quantity: item.quantity,
      name: item.name,
      metersPerHour: item.unitCapacityMetersPerHour,
    })) ?? [];
  const standardOrderLimit = productionPolicy
    ? formatQuantity(
        productionPolicy.customLeadTimeAboveMeters,
        "metro",
        "metros",
      )
    : null;
  const standardStartTime = productionPolicy
    ? formatQuantity(
        productionPolicy.standardStartWithinBusinessHours,
        "hora útil",
        "horas úteis",
      )
    : null;
  const productionNote = productionPolicy
    ? `Pedidos de até ${standardOrderLimit} entram em produção em até ${standardStartTime} depois do Pix e da aprovação da arte. Acima de ${standardOrderLimit}, o prazo é confirmado conforme a fila.`
    : "O início da produção é confirmado depois do Pix e da aprovação da arte.";

  return (
    <MarketingHomeSections
      featuredProducts={catalog.products.slice(0, 5)}
      hero={{
        eyebrow: "Produção própria para marcas",
        title: "Sua marca,",
        emphasis: "em movimento.",
        summary: "Personalize brindes e DTF, confira o preço e acompanhe a produção em um só lugar.",
        primaryAction: { label: "Ver catálogo", href: "/produtos" },
        secondaryAction: { label: "Calcular DTF", href: calculatorHref },
        image: {
          src: "/images/leal-commerce-hero-v2.png",
          alt: "Brindes, camisetas, pulseiras e materiais personalizados em uma gráfica moderna",
          priority: true,
        },
      }}
      sectors={{
        title: "Três frentes. Um padrão de cuidado.",
        description: "Escolha o que precisa agora. Cada setor terá catálogo, regras e atendimento próprios.",
        primary: {
          name: featuredProduct?.name ?? "DTF por metro",
          description:
            featuredProduct?.summary ??
            "Calcule, envie a arte, pague via Pix e acompanhe cada etapa do pedido.",
          href: productHref,
          actionLabel: "Conhecer o DTF",
          image: {
            src: "/images/dtf-textile-campaign.png",
            alt: "Amostras editoriais de tecidos com estampas coloridas",
          },
        },
        secondary: {
          name: "Brindes",
          description: "Produtos personalizados para empresas, eventos e ações de relacionamento.",
          href: "/brindes",
          actionLabel: "Ver brindes",
          image: {
            src: "/images/dtf-hero-campaign.png",
            alt: "Mesa editorial com materiais personalizados",
          },
        },
        development: {
          name: "Pulseiras e cordões",
          description: "Pulseiras, fitas e cordões para eventos, equipes e credenciamento, em uma nova linha que está sendo preparada.",
          href: "/pulseiras-e-cordoes",
          actionLabel: "Conhecer o pré-lançamento",
          status: "Em preparação",
          image: {
            src: "/images/wristbands-lanyards-detail.webp",
            alt: "Amostras editoriais de pulseiras, fitas e cordões personalizados",
          },
        },
      }}
      capacity={{
        title: "Estrutura para produzir",
        description: "A capacidade nominal é calculada pelos equipamentos cadastrados e não substitui o prazo real da fila.",
        equipment,
        productionNote,
      }}
      faq={{
        title: "Antes de fazer o pedido",
        questions: [
          { question: "O DTF aceita cartão?", answer: "Não. O produto DTF será pago exclusivamente via Pix." },
          { question: "O arquivo é aprovado automaticamente?", answer: "Não. A validação automática é mínima e a aprovação final é feita pela equipe." },
          { question: "Posso corrigir o arquivo?", answer: "Sim. Cada reenvio cria uma nova versão e preserva o histórico do pedido." },
          { question: "Posso retirar no local?", answer: "Sim. Retirada e entrega aparecem como opções separadas no pedido." },
        ],
      }}
      closing={{
        title: "Seu próximo pedido começa com o total certo",
        description: "Escolha a metragem, confira a faixa e prepare o arquivo para revisão.",
        primaryAction: { label: "Pedir DTF", href: calculatorHref },
        secondaryAction: { label: "Ver o processo", href: "/como-funciona" },
      }}
    />
  );
}
