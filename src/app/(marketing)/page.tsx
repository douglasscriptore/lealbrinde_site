import { MarketingHomeSections } from "@/components/marketing";
import { getFeaturedDtfProduct, toMarketingPriceTiers } from "@/server/queries/dtf-products";

export const dynamic = "force-dynamic";

function formatQuantity(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function HomePage() {
  const featured = getFeaturedDtfProduct();
  const tiers = toMarketingPriceTiers(featured?.priceTable ?? null);
  const featuredProduct = featured?.aggregate.product;
  const productionPolicy = featured?.aggregate.productionPolicy;
  const productHref = featuredProduct?.slug ?? "/contato";
  const calculatorHref = featuredProduct
    ? `${productHref}#calcular`
    : "/contato";
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
      hero={{
        eyebrow: "Brindes e impressão",
        title: "Sua marca.",
        emphasis: "Bem feita.",
        summary: "Brindes e DTF por metro com produção própria, revisão humana e acompanhamento claro.",
        primaryAction: { label: "Pedir DTF", href: calculatorHref },
        secondaryAction: { label: "Ver brindes", href: "/brindes" },
        image: {
          src: "/images/dtf-hero-campaign.png",
          alt: "Composição editorial de filme para impressão e tecidos personalizados",
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
          description: "Um novo setor está sendo preparado com materiais e opções de personalização.",
          href: "/pulseiras-e-cordoes",
          actionLabel: "Em desenvolvimento",
          status: "Em desenvolvimento",
        },
      }}
      dtf={{
        title: "Preço claro antes do Pix",
        description: "A metragem define a faixa de todo o pedido. O preço por metro e o total aparecem juntos antes da escolha.",
        tiers,
        action: { label: "Calcular DTF", href: calculatorHref },
      }}
      process={{
        title: "Você sabe o que acontece depois",
        description: "Do arquivo à retirada, o pedido mostra a próxima ação sem depender de mensagens soltas.",
        steps: [
          { title: "Calcule a metragem", description: "Veja faixa, valor por metro e total.", icon: "calculate" },
          { title: "Envie o arquivo", description: "A arte fica ligada ao pedido e às versões.", icon: "upload" },
          { title: "Pague via Pix", description: "O valor é recalculado e confirmado no servidor.", icon: "pix" },
          { title: "Acompanhe a revisão", description: "A equipe aprova ou explica a correção necessária.", icon: "review" },
          { title: "Entre em produção", description: "Pedido pago e arte aprovada liberam a fila.", icon: "production" },
          { title: "Retire ou receba", description: "Consulte retirada local ou rastreamento.", icon: "delivery" },
        ],
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
