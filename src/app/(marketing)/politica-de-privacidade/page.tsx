import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Política de privacidade", robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return <InfoPage label="Documento em revisão" title="Política de privacidade" description="O texto jurídico definitivo será publicado após o inventário de dados, definição das bases legais e validação do responsável pela empresa." />;
}
