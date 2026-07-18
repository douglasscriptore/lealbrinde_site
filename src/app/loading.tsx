export default function Loading() {
  return (
    <main id="conteudo" className="page-shell min-h-[70dvh] py-16" aria-busy="true">
      <span className="sr-only">Carregando conteúdo</span>
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="h-72 animate-pulse rounded-2xl bg-surface-strong" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface-strong" />
      </div>
    </main>
  );
}
