import {
  Buildings,
  CalendarDots,
  CheckCircle,
  IdentificationBadge,
  Tag,
  Ticket,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

import { MarketingLink } from "./marketing-link";
import { Reveal } from "./reveal";

const productFamilies = [
  {
    icon: Ticket,
    title: "Pulseiras para eventos",
    description:
      "Identificação visual pensada para acessos, públicos, equipes e ações temporárias.",
  },
  {
    icon: Tag,
    title: "Fitas personalizadas",
    description:
      "Uma base versátil para trabalhar cores, padrões, mensagens e presença de marca.",
  },
  {
    icon: IdentificationBadge,
    title: "Cordões para crachá",
    description:
      "Credenciamento que acompanha a rotina de empresas, eventos e equipes de atendimento.",
  },
];

const applications = [
  { icon: CalendarDots, label: "Eventos e credenciamento" },
  { icon: Buildings, label: "Empresas e instituições" },
  { icon: UsersThree, label: "Equipes e atendimento" },
];

const possibilities = [
  "Cores alinhadas à identidade da ação",
  "Aplicação de marca, arte ou mensagem",
  "Composição com crachá e credencial",
  "Planejamento para diferentes volumes",
];

export function WristbandsPrelaunch() {
  return (
    <main id="conteudo">
      <section className="bg-[radial-gradient(circle_at_78%_18%,var(--accent-soft),transparent_30%),radial-gradient(circle_at_8%_86%,var(--surface-strong),transparent_34%),var(--background)]">
        <div className="mx-auto grid min-h-[680px] max-w-shell items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <Reveal variant="fade">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
                <Wrench aria-hidden="true" size={17} weight="duotone" />
                Novo setor em preparação
              </div>
              <h1 className="mt-7 text-balance text-[clamp(3.35rem,6.5vw,6.8rem)] font-black leading-[0.9] tracking-[-0.065em] text-foreground">
                Identificação que também comunica sua marca.
              </h1>
              <p className="mt-7 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">
                Estamos preparando uma linha de pulseiras, fitas e cordões para eventos, empresas, equipes e ações promocionais.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <MarketingLink label="Conhecer as linhas" href="#linhas" />
              <MarketingLink
                label="Ver produtos disponíveis"
                href="/produtos"
                variant="secondary"
              />
            </Reveal>
          </div>

          <Reveal variant="scale" delay={0.08} className="relative min-h-[430px] self-stretch md:min-h-[590px]">
            <div className="absolute inset-0 overflow-hidden rounded-card border border-white/80 bg-surface-strong shadow-premium">
              <Image
                src="/images/wristbands-lanyards-hero.webp"
                alt="Conceito editorial de pulseiras, fitas e cordões para identificação"
                fill
                priority
                sizes="(max-width: 767px) 100vw, 56vw"
                className="object-cover object-center"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="linhas" className="scroll-mt-28 bg-[linear-gradient(180deg,var(--surface),var(--surface-strong),var(--surface))] py-20 sm:py-28">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">O que está sendo preparado</p>
            <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.05em] text-foreground sm:text-6xl">
              Três linhas para organizar, identificar e representar.
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
              O catálogo final ainda será confirmado. Por enquanto, apresentamos as famílias que orientarão o novo setor.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            <Reveal variant="scale" className="relative min-h-[440px] overflow-hidden rounded-card border border-white/80 shadow-premium lg:col-span-7 lg:min-h-[620px]">
              <Image
                src="/images/wristbands-lanyards-detail.webp"
                alt="Detalhe editorial de materiais para pulseiras e cordões personalizados"
                fill
                sizes="(max-width: 1023px) 100vw, 58vw"
                className="object-cover"
              />
            </Reveal>

            <div className="overflow-hidden rounded-card border border-border bg-white shadow-premium lg:col-span-5">
              {productFamilies.map(({ icon: Icon, title, description }, index) => (
                <Reveal
                  key={title}
                  variant="fade-up"
                  delay={index * 0.05}
                  className="group flex min-h-48 gap-5 border-b border-border p-6 last:border-b-0 sm:p-8"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-control bg-accent-soft text-accent transition-transform duration-(--duration-smooth) ease-premium motion-safe:group-hover:-translate-y-1">
                    <Icon aria-hidden="true" size={25} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.03em] text-foreground">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto grid max-w-shell gap-12 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-8">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Onde essa linha pode entrar</p>
            <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.05em] text-foreground sm:text-6xl">
              Da entrada do evento à rotina da equipe.
            </h2>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted">
              A proposta é unir identificação clara e presença de marca em materiais que acompanham pessoas e operações.
            </p>
          </Reveal>

          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              {applications.map(({ icon: Icon, label }, index) => (
                <Reveal key={label} variant="scale" delay={index * 0.05} className="rounded-card border border-border bg-surface p-5 shadow-premium">
                  <Icon aria-hidden="true" size={28} weight="duotone" className="text-accent" />
                  <p className="mt-7 font-bold leading-snug text-foreground">{label}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-5 rounded-card border border-border bg-surface-strong/65 p-6 shadow-premium sm:p-8">
              <h3 className="text-xl font-black tracking-[-0.025em] text-foreground">Possibilidades de personalização</h3>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {possibilities.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-foreground">
                    <CheckCircle aria-hidden="true" size={19} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-background px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <Reveal className="mx-auto grid max-w-shell gap-9 overflow-hidden rounded-card border border-accent/25 bg-[radial-gradient(circle_at_88%_0%,var(--accent-soft),transparent_34%),linear-gradient(145deg,var(--surface),var(--surface-strong))] p-7 shadow-premium sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-14">
          <div>
            <div className="flex items-center gap-3 text-accent">
              <Wrench aria-hidden="true" size={28} weight="duotone" />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Pré-lançamento transparente</p>
            </div>
            <h2 className="mt-6 max-w-[18ch] text-balance text-4xl font-black tracking-[-0.05em] text-foreground sm:text-6xl">
              O catálogo vem depois da confirmação dos detalhes.
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted">
              Materiais, medidas, acabamentos, quantidades e prazos serão publicados somente quando estiverem definidos e validados pela Leal Brinde.
            </p>
          </div>
          <MarketingLink
            label="Explorar o catálogo"
            href="/produtos"
            variant="secondary"
          />
        </Reveal>
      </section>
    </main>
  );
}
