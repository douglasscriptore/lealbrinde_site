import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = {
  title: "Pulseiras e cordões",
  robots: { index: false, follow: false },
};

export default function WristbandsPage() {
  return (
    <InfoPage
      label="Em desenvolvimento"
      title="Pulseiras, fitas e cordões"
      description="Este setor está sendo preparado com produtos, materiais e opções de personalização. Ele será publicado quando o catálogo estiver completo."
    />
  );
}
