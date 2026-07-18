import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Contato" };

export default function ContactPage() {
  return <InfoPage title="Fale com a Leal Brinde" description="Os canais, horários e endereço serão publicados depois da confirmação dos dados oficiais pelo cliente." />;
}
