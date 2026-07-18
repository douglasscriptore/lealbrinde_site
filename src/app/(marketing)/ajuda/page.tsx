import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = { title: "Ajuda" };

export default function HelpPage() {
  return (
    <InfoPage title="Ajuda com seu pedido" description="Consulte o pedido primeiro. A timeline mostra pagamento, revisão da arte, produção, retirada e entrega.">
      <Link href="/entrar" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground">Acompanhar pedido</Link>
    </InfoPage>
  );
}
