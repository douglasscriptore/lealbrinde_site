"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8 grid min-h-[70dvh] place-items-center py-16">
      <section className="max-w-xl rounded-2xl border bg-surface p-8 text-center shadow-premium">
        <WarningCircleIcon aria-hidden size={42} weight="duotone" className="mx-auto text-danger" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Não foi possível carregar esta página</h1>
        <p className="mt-3 text-muted">Tente novamente. Se o problema continuar, fale com o atendimento.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
