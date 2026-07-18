import { CapacitySection } from "./capacity-section";
import { ClosingCta } from "./closing-cta";
import { DtfHighlight } from "./dtf-highlight";
import { FaqSection } from "./faq-section";
import { MarketingHero, type MarketingHeroProps } from "./hero";
import { ProcessSection } from "./process-section";
import { SectorGateway } from "./sector-gateway";
import { ShopeeShowcase } from "./shopee-showcase";
import type {
  EquipmentCapacity,
  FrequentlyAskedQuestion,
  MarketingAction,
  PriceTier,
  ProcessStep,
  Sector,
} from "./types";

export type MarketingHomeSectionsProps = {
  hero: MarketingHeroProps;
  sectors: {
    title: string;
    description: string;
    primary: Sector;
    secondary: Sector;
    development: Sector;
  };
  dtf: {
    title: string;
    description: string;
    tiers: PriceTier[];
    action: MarketingAction;
  };
  process: {
    title: string;
    description: string;
    steps: ProcessStep[];
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
  hero,
  sectors,
  dtf,
  process,
  capacity,
  faq,
  closing,
}: MarketingHomeSectionsProps) {
  return (
    <main id="conteudo">
      <MarketingHero {...hero} />
      <SectorGateway {...sectors} />
      <DtfHighlight {...dtf} />
      <ProcessSection {...process} />
      <CapacitySection {...capacity} />
      <FaqSection {...faq} />
      <ClosingCta {...closing} />
      <ShopeeShowcase />
    </main>
  );
}
