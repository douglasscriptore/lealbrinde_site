import { CapacitySection } from "./capacity-section";
import { ClosingCta } from "./closing-cta";
import { FaqSection } from "./faq-section";
import { FeaturedProducts } from "./featured-products";
import { MarketingHero, type MarketingHeroProps } from "./hero";
import { ProductionVideoSection } from "./production-video-section";
import { SectorGateway } from "./sector-gateway";
import { ShopeeShowcase } from "./shopee-showcase";
import type { StandardProductSummary } from "@/domain";
import type {
  EquipmentCapacity,
  FrequentlyAskedQuestion,
  MarketingAction,
  Sector,
} from "./types";

export type MarketingHomeSectionsProps = {
  featuredProducts?: StandardProductSummary[];
  hero: MarketingHeroProps;
  sectors: {
    title: string;
    description: string;
    primary: Sector;
    secondary: Sector;
    development: Sector;
  };
  capacity: {
    title: string;
    description: string;
    equipment: EquipmentCapacity[];
    productionNote: string;
  };
  faq: {
    title: string;
    description?: string;
    questions: FrequentlyAskedQuestion[];
  };
  closing: {
    title: string;
    description: string;
    primaryAction: MarketingAction;
    secondaryAction?: MarketingAction;
  };
};

export function MarketingHomeSections({
  featuredProducts = [],
  hero,
  sectors,
  capacity,
  faq,
  closing,
}: MarketingHomeSectionsProps) {
  return (
    <main id="conteudo">
      <MarketingHero {...hero} />
      <SectorGateway {...sectors} />
      <ProductionVideoSection />
      <CapacitySection {...capacity} />
      <FaqSection {...faq} />
      <ClosingCta {...closing} />
      <FeaturedProducts products={featuredProducts} />
      <ShopeeShowcase />
    </main>
  );
}
