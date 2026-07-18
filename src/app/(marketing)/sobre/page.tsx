import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Sobre a Leal Brinde" };

export default function AboutPage() {
  return <InfoPage title="Produção próxima, processo transparente" description="A Leal Brinde atende empresas, personalizadores e clientes locais com brindes e impressão DTF. Esta página receberá a história e as fotografias reais da equipe antes do lançamento." />;
}
