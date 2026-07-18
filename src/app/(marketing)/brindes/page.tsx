import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOutIcon, GiftIcon } from "@phosphor-icons/react/dist/ssr";
import { InfoPage } from "@/components/content/info-page";

export const metadata: Metadata = {
  title: "Brindes personalizados",
  description: "Encontre brindes personalizados para empresas, eventos e ações de relacionamento.",
};

export default function GiftsPage() {
  const destination = process.env.NEXT_PUBLIC_GIFTS_DESTINATION_URL ?? "https://lealbrinde.com.br/shop/";

  return (
    <InfoPage
      label="Brindes personalizados"
      title="Sua marca presente no dia a dia"
      description="O novo catálogo está sendo preparado. Enquanto isso, você pode consultar os produtos disponíveis na loja atual da Leal Brinde."
    >
      <div className="grid gap-8 rounded-2xl border bg-surface p-7 sm:grid-cols-[auto_1fr] sm:items-center sm:p-10">
        <GiftIcon aria-hidden size={54} weight="duotone" className="text-accent" />
        <div>
          <h2 className="text-2xl font-semibold">Acesse o catálogo atual</h2>
          <p className="mt-2 max-w-[58ch] text-muted">A navegação abre a loja existente em outra aba. Nenhum produto foi migrado ou alterado.</p>
          <Link
            href={destination}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground"
          >
            Ver catálogo
            <ArrowSquareOutIcon aria-hidden size={20} weight="bold" />
          </Link>
        </div>
      </div>
    </InfoPage>
  );
}
