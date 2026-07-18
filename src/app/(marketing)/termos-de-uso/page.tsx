import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Termos de uso", robots: { index: false, follow: false } };

export default function TermsPage() {
  return <InfoPage label="Documento em revisão" title="Termos de uso" description="Regras de compra, responsabilidade pelo arquivo, aprovação, produção e atendimento serão validadas antes da abertura dos pedidos reais." />;
}
