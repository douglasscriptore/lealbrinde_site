import { ArrowRight, Wrench } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import { MotionSurface } from "@/components/motion";

import { Reveal } from "./reveal";
import type { Sector } from "./types";

type SectorGatewayProps = {
  title: string;
  description: string;
  primary: Sector;
  secondary: Sector;
  development: Sector;
};

function SectorAction({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-black text-accent">
      {label}
      <ArrowRight aria-hidden size={17} weight="bold" className="transition-transform duration-fast group-hover:translate-x-1" />
    </span>
  );
}

function SectorImage({ sector, sizes, className = "" }: { sector: Sector; sizes: string; className?: string }) {
  if (!sector.image) return <div className={`bg-surface-strong ${className}`} />;
  return (
    <div className={`relative overflow-hidden bg-surface-strong ${className}`}>
      <Image
        src={sector.image.src}
        alt={sector.image.alt}
        fill
        sizes={sector.image.sizes ?? sizes}
        className="object-cover transition-transform duration-700 ease-premium motion-safe:group-hover:scale-[1.025]"
      />
    </div>
  );
}

export function SectorGateway({ title, description, primary, secondary, development }: SectorGatewayProps) {
  return (
    <section className="bg-surface-subtle py-20 sm:py-28">
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">{title}</h2>
          <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted sm:text-lg">{description}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-12 lg:grid-rows-[1fr_1fr]">
          <Reveal className="lg:col-span-7 lg:row-span-2">
            <MotionSurface className="h-full">
              <Link href={primary.href} className="group flex h-full min-h-[570px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-premium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                <SectorImage sector={primary} sizes="(max-width: 1023px) 100vw, 58vw" className="min-h-[360px] flex-1" />
                <div className="grid gap-5 p-7 sm:grid-cols-[1fr_auto] sm:items-end sm:p-9">
                  <div>
                    <h3 className="text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">{primary.name}</h3>
                    <p className="mt-3 max-w-[48ch] text-sm leading-6 text-muted sm:text-base">{primary.description}</p>
                  </div>
                  <SectorAction label={primary.actionLabel} />
                </div>
              </Link>
            </MotionSurface>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-5">
            <MotionSurface className="h-full">
              <Link href={secondary.href} className="group grid h-full min-h-[285px] overflow-hidden rounded-card border border-border bg-surface shadow-premium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:grid-cols-[0.9fr_1.1fr]">
                <SectorImage sector={secondary} sizes="(max-width: 639px) 100vw, 25vw" className="min-h-52" />
                <div className="flex flex-col justify-between p-6 sm:p-7">
                  <div>
                    <h3 className="text-3xl font-black tracking-[-0.04em] text-foreground">{secondary.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{secondary.description}</p>
                  </div>
                  <div className="mt-6"><SectorAction label={secondary.actionLabel} /></div>
                </div>
              </Link>
            </MotionSurface>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-5">
            <MotionSurface className="h-full">
              <Link href={development.href} className="group grid h-full min-h-[285px] overflow-hidden rounded-card border border-accent/20 bg-[linear-gradient(135deg,var(--surface-strong),var(--surface))] shadow-premium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:grid-cols-[1.08fr_0.92fr]">
                <div className="flex flex-col justify-between p-6 sm:p-7">
                  <div>
                    <div className="flex items-center gap-3 text-accent"><Wrench aria-hidden size={26} weight="duotone" /><span className="text-xs font-bold uppercase tracking-[0.14em]">{development.status}</span></div>
                    <h3 className="mt-5 text-3xl font-black tracking-[-0.04em] text-foreground">{development.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{development.description}</p>
                  </div>
                  <div className="mt-6"><SectorAction label={development.actionLabel} /></div>
                </div>
                <SectorImage sector={development} sizes="(max-width: 639px) 100vw, 22vw" className="min-h-56" />
              </Link>
            </MotionSurface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
