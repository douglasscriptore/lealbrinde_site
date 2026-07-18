import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="page-shell grid min-h-[70dvh] place-items-center py-16">
      <section className="max-w-xl text-center">
        <p className="font-mono text-sm font-semibold text-accent">Página não encontrada</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Este endereço não está disponível</h1>
        <p className="mt-4 text-muted">Confira o link ou volte para conhecer os serviços da Leal Brinde.</p>
        <Link href="/" className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
