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
    <section className="bg-[var(--background)] py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {description}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          {groupedSpecifications.map(([group, items], index) => (
            <Reveal
              key={group}
              delay={Math.min(index * 0.04, 0.12)}
              className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 ${
                index % 4 === 0 || index % 4 === 3 ? "lg:col-span-7" : "lg:col-span-5"
              }`}
            >
              <div className="flex items-center gap-3">
                <SealCheck aria-hidden="true" size={28} weight="duotone" className="text-[var(--accent)]" />
                <h3 className="text-2xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                  {group}
                </h3>
              </div>
              <dl className="mt-7 grid gap-5">
                {items.map((item) => (
                  <div key={`${group}-${item.title}`}>
                    <dt className="font-bold text-[var(--foreground)]">{item.title}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
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
