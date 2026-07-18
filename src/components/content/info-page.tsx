import type { ReactNode } from "react";

export function InfoPage({
  label,
  title,
  description,
  children,
}: {
  label?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main id="conteudo" className="page-shell min-h-[65dvh] py-16 sm:py-24">
      <div className="max-w-3xl">
        {label ? <p className="font-mono text-sm font-semibold text-accent">{label}</p> : null}
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-muted">{description}</p>
      </div>
      {children ? <div className="mt-12">{children}</div> : null}
    </main>
  );
}
