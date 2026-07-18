import { CheckCircle, FileText, QrCode } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

import { CapacitySection } from "./capacity-section";
import { ClosingCta } from "./closing-cta";
import { DtfCalculator } from "./dtf-calculator";
import { FaqSection } from "./faq-section";
import { MarketingLink } from "./marketing-link";
import { PriceTable } from "./price-table";
import { ProductSpecifications } from "./product-specifications";
import { Reveal } from "./reveal";
import type {
  EquipmentCapacity,
  FrequentlyAskedQuestion,
  MarketingAction,
  MarketingImage,
  PriceTier,
  ProductSpecification,
} from "./types";

export type DtfProductPageProps = {
  product: {
    name: string;
    summary: string;
    description: string;
    image: MarketingImage;
  };
  pricing: {
    title: string;
    description: string;
    tiers: PriceTier[];
    minimumMeters: number;
    meterIncrement: number;
    initialMeters?: number;
    orderHref: string;
  };
  fileGuideAction: MarketingAction;
  specifications: {
    title: string;
    description: string;
    items: ProductSpecification[];
  };
  production: {
    title: string;
    description: string;
    equipment: EquipmentCapacity[];
    note: string;
  };
  differentiators: {
    title: string;
    description: string;
    items: string[];
  };
  applicationNote: {
    title: string;
    description: string;
    action?: MarketingAction;
  };
  faq?: {
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

export function DtfProductPage({
  product,
  pricing,
  fileGuideAction,
  specifications,
  production,
  differentiators,
  applicationNote,
  faq,
  closing,
}: DtfProductPageProps) {
  return (
    <main id="conteudo">
      <section className="bg-[radial-gradient(circle_at_76%_22%,var(--accent-soft),transparent_30%),radial-gradient(circle_at_12%_82%,var(--surface-strong),transparent_36%),var(--background)]">
        <div className="mx-auto grid min-h-[680px] max-w-shell items-center gap-9 px-4 py-12 sm:px-6 md:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-8 lg:py-16">
          <Reveal className="max-w-2xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">
              DTF por metro
            </p>
            <h1 className="text-balance text-[clamp(3.4rem,7vw,7rem)] font-black leading-[0.89] tracking-[-0.065em] text-foreground">
              {product.name}
            </h1>
            <p className="mt-7 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">
              <strong className="font-semibold text-foreground">{product.summary}</strong>{" "}
              {product.description}
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <MarketingLink label="Calcular meu pedido" href="#calcular" />
              <MarketingLink {...fileGuideAction} variant="secondary" />
            </div>
          </Reveal>

          <Reveal variant="scale" delay={0.08} className="relative min-h-[460px] self-stretch md:min-h-[590px]">
            <div className="absolute inset-0 overflow-hidden rounded-card border border-white/80 bg-surface-strong shadow-premium">
              <Image
                src={product.image.src}
                alt={product.image.alt}
                fill
                preload={product.image.priority ?? true}
                loading="eager"
                sizes={product.image.sizes ?? "(max-width: 767px) 100vw, 54vw"}
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="calcular" className="scroll-mt-24 bg-[linear-gradient(180deg,var(--surface),var(--surface-strong),var(--surface))] py-20 sm:py-28">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
              {pricing.title}
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
              {pricing.description}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <Reveal>
              <PriceTable tiers={pricing.tiers} />
              <div className="mt-5 flex items-start gap-3 rounded-card border border-border bg-background p-5 shadow-premium">
                <QrCode aria-hidden="true" size={24} weight="duotone" className="shrink-0 text-accent" />
                <p className="text-sm leading-relaxed text-muted">
                  O DTF é pago exclusivamente via Pix. O pagamento acontece depois da validação mínima do arquivo.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <DtfCalculator
                tiers={pricing.tiers}
                minimumMeters={pricing.minimumMeters}
                meterIncrement={pricing.meterIncrement}
                initialMeters={pricing.initialMeters}
                orderHref={pricing.orderHref}
              />
            </Reveal>
          </div>
        </div>
      </section>

      <ProductSpecifications
        title={specifications.title}
        description={specifications.description}
        specifications={specifications.items}
      />

      <CapacitySection
        title={production.title}
        description={production.description}
        equipment={production.equipment}
        productionNote={production.note}
      />

      <section className="bg-[linear-gradient(145deg,var(--surface),var(--surface-strong))] py-20 sm:py-28">
        <div className="mx-auto grid max-w-shell gap-12 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-8">
          <Reveal>
            <CheckCircle aria-hidden="true" size={40} weight="duotone" className="text-accent" />
            <h2 className="mt-7 text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
              {differentiators.title}
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
              {differentiators.description}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <ul className="columns-1 gap-10 sm:columns-2">
              {differentiators.items.map((item) => (
                <li key={item} className="mb-6 flex break-inside-avoid items-start gap-3 text-base font-semibold leading-relaxed text-foreground">
                  <CheckCircle aria-hidden="true" size={21} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-background px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-4xl rounded-card border border-border bg-surface px-6 py-12 text-center shadow-premium sm:px-10">
          <FileText aria-hidden="true" size={42} weight="duotone" className="mx-auto text-accent" />
          <h2 className="mt-7 text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
            {applicationNote.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[62ch] text-base leading-relaxed text-muted">
            {applicationNote.description}
          </p>
          {applicationNote.action ? (
            <div className="mt-8">
              <MarketingLink {...applicationNote.action} variant="secondary" />
            </div>
          ) : null}
        </Reveal>
      </section>

      {faq ? <FaqSection {...faq} /> : null}
      <ClosingCta {...closing} />
    </main>
  );
}
