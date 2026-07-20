import { Factory, Palette, SealCheck } from "@phosphor-icons/react/dist/ssr";

import { AmbientProductionVideo } from "./ambient-production-video";
import { MarketingLink } from "./marketing-link";

const videoSrc = "/videos/dtf-impressao-alta-qualidade.mp4";
const posterSrc = "/videos/dtf-impressao-poster.jpg";

export function ProductionVideoSection() {
  return (
    <section className="bg-surface-subtle py-20 sm:py-28">
      <div className="mx-auto grid max-w-shell items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Impressão real
          </p>
          <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
            Veja a definição durante a produção
          </h2>
          <p className="mt-6 max-w-[48ch] text-base leading-7 text-muted sm:text-lg">
            Registro real de uma impressão DTF, com cores intensas e detalhes visíveis ainda na saída da máquina.
          </p>

          <div className="mt-8 grid gap-5 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
                <Factory aria-hidden size={21} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">Filmagem da produção</p>
                <p className="mt-1 text-xs leading-5 text-muted">Processo registrado diretamente na impressora.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
                <Palette aria-hidden size={21} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">Detalhe visível</p>
                <p className="mt-1 text-xs leading-5 text-muted">Contornos, branco e cores vistos em movimento.</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MarketingLink label="Calcular meu DTF" href="/dtf/textil-por-metro#calcular" />
          </div>
        </div>

        <div className="relative">
          <span aria-hidden className="absolute -inset-4 rounded-[1.45rem] bg-[radial-gradient(circle_at_72%_18%,var(--accent-soft),transparent_52%)]" />
          <div className="relative overflow-hidden rounded-card border border-white bg-foreground shadow-float">
            <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/92 px-4 py-2 text-xs font-black text-foreground shadow-premium backdrop-blur-md sm:left-5 sm:top-5 sm:text-sm">
              <SealCheck aria-hidden size={19} weight="fill" className="shrink-0 text-accent" />
              <span>Qualidade real da nossa impressão</span>
            </div>
            <AmbientProductionVideo
              className="aspect-[4/5] w-full object-cover object-center sm:aspect-[16/10]"
              label="Impressão DTF de borboletas e flores em alta definição"
              poster={posterSrc}
              src={videoSrc}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
