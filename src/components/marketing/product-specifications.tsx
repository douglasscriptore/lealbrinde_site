import { SealCheck } from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "./reveal";
import type { ProductSpecification } from "./types";

type ProductSpecificationsProps = {
  title: string;
  description: string;
  specifications: ProductSpecification[];
};

export function ProductSpecifications({
  title,
  description,
  specifications,
}: ProductSpecificationsProps) {
  const groupedSpecifications = Array.from(
    specifications
      .filter((specification) => specification.visible)
      .sort((first, second) => first.position - second.position)
      .reduce((groups, specification) => {
        const group = groups.get(specification.group) ?? [];
        group.push(specification);
        groups.set(specification.group, group);
        return groups;
      }, new Map<string, ProductSpecification[]>()),
  );

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
            {description}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          {groupedSpecifications.map(([group, items], index) => (
            <Reveal
              key={group}
              delay={Math.min(index * 0.04, 0.12)}
              variant="scale"
              className={`rounded-card border border-border p-6 shadow-premium sm:p-8 ${
                index % 2 === 0 ? "bg-surface" : "bg-surface-strong/60"
              } ${
                index % 4 === 0 || index % 4 === 3 ? "lg:col-span-7" : "lg:col-span-5"
              }`}
            >
              <div className="flex items-center gap-3">
                <SealCheck aria-hidden="true" size={28} weight="duotone" className="text-accent" />
                <h3 className="text-2xl font-black tracking-[-0.03em] text-foreground">
                  {group}
                </h3>
              </div>
              <dl className="mt-7 grid gap-5">
                {items.map((item) => (
                  <div key={`${group}-${item.title}`}>
                    <dt className="font-bold text-foreground">{item.title}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">
                      {item.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
