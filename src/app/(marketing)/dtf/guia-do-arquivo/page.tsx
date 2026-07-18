import type { Metadata } from "next";
import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = {
  title: "Guia do arquivo DTF",
  robots: { index: false, follow: false },
};

export default function ArtworkGuidePage() {
  return (
    <InfoPage
      label="Guia provisório"
      title="Prepare sua arte para a revisão"
      description="As regras definitivas de largura, tamanho e resolução ainda precisam ser confirmadas antes da publicação comercial."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border bg-surface p-7 sm:p-9">
          <CheckCircleIcon aria-hidden size={34} weight="duotone" className="text-accent" />
          <h2 className="mt-5 text-2xl font-semibold">O que já está definido</h2>
          <ul className="mt-5 grid gap-3 text-muted sm:grid-cols-2">
            <li>Um arquivo pronto por pedido</li>
            <li>Versões preservadas em correções</li>
            <li>Validação mínima antes do Pix</li>
            <li>Aprovação final feita por uma pessoa</li>
          </ul>
        </section>
        <section className="rounded-2xl border bg-accent-soft p-7 sm:p-9">
          <WarningIcon aria-hidden size={34} weight="duotone" className="text-warning" />
          <h2 className="mt-5 text-2xl font-semibold">Confirmações pendentes</h2>
          <p className="mt-4 text-muted">Largura útil, formatos aceitos, limite do arquivo, DPI recomendado, política de fundo e orientação de cores.</p>
        </section>
      </div>
    </InfoPage>
  );
}
