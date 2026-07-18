import { ArrowUpRight, Wrench } from "@phosphor-icons/react/dist/ssr";
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
    <span className="inline-flex items-center gap-2 text-sm font-bold">
      {label}
      <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
    </span>
  );
}

export function SectorGateway({
  title,
  description,
  primary,
  secondary,
  development,
}: SectorGatewayProps) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">
            {description}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2">
          <Reveal className="md:col-span-7 md:row-span-2">
            <MotionSurface className="h-full">
              <Link
                href={primary.href}
                className="group relative flex min-h-[560px] overflow-hidden rounded-card border border-white/70 bg-surface-strong shadow-premium transition-shadow duration-(--duration-smooth) hover:shadow-premium-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:h-full"
              >
              {primary.image ? (
                <Image
                  src={primary.image.src}
                  alt={primary.image.alt}
                  fill
                  sizes={primary.image.sizes ?? "(max-width: 767px) 100vw, 58vw"}
                  className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.025]"
                />
              ) : null}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="relative mt-auto max-w-xl p-7 text-white sm:p-10">
                <h3 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">{primary.name}</h3>
                <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-white/80">
                  {primary.description}
                </p>
                <div className="mt-6">
                  <SectorAction label={primary.actionLabel} />
                </div>
              </div>
              </Link>
            </MotionSurface>
          </Reveal>

          <Reveal delay={0.05} className="md:col-span-5">
            <MotionSurface className="h-full">
              <Link
                href={secondary.href}
                className="group relative flex min-h-[310px] overflow-hidden rounded-card border border-white/70 bg-surface-strong shadow-premium transition-shadow duration-(--duration-smooth) hover:shadow-premium-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:h-full"
              >
              {secondary.image ? (
                <Image
                  src={secondary.image.src}
                  alt={secondary.image.alt}
                  fill
                  sizes={secondary.image.sizes ?? "(max-width: 767px) 100vw, 42vw"}
                  className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.025]"
                />
              ) : null}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative mt-auto p-7 text-white sm:p-8">
                <h3 className="text-3xl font-black tracking-[-0.04em]">{secondary.name}</h3>
                <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-white/80">
                  {secondary.description}
                </p>
                <div className="mt-5">
                  <SectorAction label={secondary.actionLabel} />
                </div>
              </div>
              </Link>
            </MotionSurface>
          </Reveal>

          <Reveal delay={0.1} className="md:col-span-5">
            <MotionSurface className="h-full">
              <Link
                href={development.href}
                className="group relative flex min-h-[250px] h-full flex-col justify-between overflow-hidden rounded-card border border-white/70 bg-surface-strong p-7 shadow-premium transition-shadow duration-(--duration-smooth) hover:shadow-premium-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-8"
              >
                {development.image ? (
                  <Image
                    src={development.image.src}
                    alt={development.image.alt}
                    fill
                    sizes={development.image.sizes ?? "(max-width: 767px) 100vw, 42vw"}
                    className="object-cover transition-transform duration-700 ease-premium motion-safe:group-hover:scale-[1.025]"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 ${
                    development.image
                      ? "bg-gradient-to-t from-black/82 via-black/28 to-black/5"
                      : "bg-[linear-gradient(145deg,var(--surface),var(--surface-strong))]"
                  }`}
                />
                <div className="relative flex items-start justify-between gap-5">
                  <Wrench
                    aria-hidden="true"
                    size={34}
                    weight="duotone"
                    className={development.image ? "text-white" : "text-accent"}
                  />
                  {development.status ? (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        development.image
                          ? "border-white/35 bg-black/20 text-white backdrop-blur-sm"
                          : "border-border text-muted"
                      }`}
                    >
                      {development.status}
                    </span>
                  ) : null}
                </div>
                <div className={`relative mt-8 ${development.image ? "text-white" : "text-foreground"}`}>
                  <h3 className="text-3xl font-black tracking-[-0.04em]">
                    {development.name}
                  </h3>
                  <p
                    className={`mt-3 max-w-[44ch] text-sm leading-relaxed ${
                      development.image ? "text-white/80" : "text-muted"
                    }`}
                  >
                    {development.description}
                  </p>
                  <div className="mt-5">
                    <SectorAction label={development.actionLabel} />
                  </div>
                </div>
              </Link>
            </MotionSurface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
