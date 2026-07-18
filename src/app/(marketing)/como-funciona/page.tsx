import type { Metadata } from "next";
import { CheckCircleIcon, FileArrowUpIcon, PackageIcon, QrCodeIcon } from "@phosphor-icons/react/dist/ssr";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Entenda o processo do pedido DTF, do cálculo até a retirada ou entrega.",
};

const steps = [
  { title: "Calcule", text: "Informe metros inteiros e veja faixa, valor por metro e total.", icon: QrCodeIcon },
  { title: "Envie a arte", text: "Anexe o arquivo pronto e acompanhe a validação mínima.", icon: FileArrowUpIcon },
  { title: "Aprove", text: "Depois do Pix, a equipe aprova ou solicita uma correção objetiva.", icon: CheckCircleIcon },
  { title: "Receba", text: "Acompanhe produção, retirada local ou envio no seu pedido.", icon: PackageIcon },
];

export default function HowItWorksPage() {
  return (
    <InfoPage title="Do arquivo ao material pronto" description="Cada etapa aparece no pedido com estado, responsável e próxima ação.">
      <div className="grid gap-5 sm:grid-cols-2">
        {steps.map(({ title, text, icon: Icon }) => (
          <section key={title} className="rounded-2xl border bg-surface p-6">
            <Icon aria-hidden size={32} weight="duotone" className="text-accent" />
            <h2 className="mt-5 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-muted">{text}</p>
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
