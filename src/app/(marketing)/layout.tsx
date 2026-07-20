import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { WhatsappFloat } from "@/components/marketing/whatsapp-float";
import { shopeeStore } from "@/lib/marketplace";

const logo = {
  src: "/images/leal-brinde-logo.png",
  alt: "Leal Brinde",
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingHeader
        logo={logo}
        navigation={[
          { label: "Início", href: "/" },
          { label: "Produtos", href: "/produtos" },
          { label: "DTF por metro", href: "/dtf" },
          { label: "Pulseiras", href: "/pulseiras-e-cordoes" },
          { label: "Como funciona", href: "/como-funciona" },
        ]}
      />
      {children}
      <MarketingFooter
        logo={logo}
        description="Brindes personalizados e DTF têxtil por metro com produção própria, revisão de arquivo e acompanhamento claro."
        columns={[
          {
            title: "Serviços",
            links: [
              { label: "Brindes", href: "/brindes" },
              { label: "Catálogo próprio", href: "/produtos" },
              { label: "DTF por metro", href: "/dtf" },
              { label: "Como funciona", href: "/como-funciona" },
            ],
          },
          {
            title: "Atendimento",
            links: [
              { label: "Acompanhar pedido", href: "/entrar" },
              { label: "Ajuda", href: "/ajuda" },
              { label: "Contato", href: "/contato" },
            ],
          },
          {
            title: "Transparência",
            links: [
              { label: "Privacidade", href: "/politica-de-privacidade" },
              { label: "Termos de uso", href: "/termos-de-uso" },
              { label: "Cancelamentos", href: "/politica-de-cancelamento" },
            ],
          },
        ]}
        legalText={`© ${new Date().getFullYear()} Leal Brinde. Todos os direitos reservados.`}
        socialLinks={[{ label: `${shopeeStore.name}, ${shopeeStore.salesLabel}`, href: shopeeStore.url, external: true }]}
      />
      <WhatsappFloat />
    </>
  );
}
