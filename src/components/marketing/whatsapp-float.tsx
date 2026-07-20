import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

const phone = "5544984219433";
const message = "Olá vim do site da lealbrinde e gostaria de atendimento";
const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

export function WhatsappFloat() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a Leal Brinde pelo WhatsApp"
      title="Falar pelo WhatsApp"
      className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full border border-white/70 bg-whatsapp text-white shadow-premium transition-[transform,background-color,box-shadow] duration-(--duration-fast) ease-premium hover:-translate-y-1 hover:bg-whatsapp-strong hover:shadow-premium-hover focus-visible:outline-foreground active:translate-y-px active:scale-[0.96] sm:bottom-6 sm:right-6 sm:size-16"
    >
      <WhatsappLogo aria-hidden size={32} weight="fill" className="sm:size-9" />
    </a>
  );
}
