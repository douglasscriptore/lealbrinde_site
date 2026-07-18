import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Cancelamentos e reembolsos", robots: { index: false, follow: false } };

export default function CancellationPage() {
  return <InfoPage label="Documento em revisão" title="Cancelamentos e reembolsos" description="A política deverá explicar o que acontece antes e depois da aprovação da arte, do início da produção e de qualquer alteração de metragem em pedido já pago." />;
}
