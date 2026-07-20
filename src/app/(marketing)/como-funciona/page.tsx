import type { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  Factory,
  Package,
  PixLogo,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { MarketingLink, ProcessExplorer, Reveal } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Entenda como comprar DTF e brindes personalizados, do cálculo e pagamento até a revisão, produção, retirada ou entrega.",
};

export default function HowItWorksPage() {
  return (
    <main id="conteudo" className="overflow-hidden bg-background">
      <ProcessExplorer />

      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,0.76fr)_minmax(30rem,1.24fr)] lg:items-center lg:gap-16">
            <div className="max-w-xl">
              <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
                Dois sinais liberam a produção
              </h2>
              <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
                Pagamento e arte têm estados independentes. O pedido entra na fila somente quando os dois estiverem confirmados.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface-subtle p-5 shadow-premium sm:p-7">
              <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-card border border-accent/20 bg-white p-6">
                  <span className="grid size-12 place-items-center rounded-control bg-accent-soft text-accent">
                    <PixLogo aria-hidden size={25} weight="duotone" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-foreground">Pagamento confirmado</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">A cobrança precisa estar marcada como paga.</p>
                </div>
                <div aria-hidden className="grid place-items-center text-3xl font-light text-chrome-strong">+</div>
                <div className="rounded-card border border-accent/20 bg-white p-6">
                  <span className="grid size-12 place-items-center rounded-control bg-accent-soft text-accent">
                    <CheckCircle aria-hidden size={25} weight="duotone" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-foreground">Arte aprovada</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">A versão correta precisa passar pela revisão.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 rounded-card bg-accent p-5 text-white sm:px-6">
                <Factory aria-hidden size={28} weight="duotone" className="shrink-0" />
                <div>
                  <p className="font-black">Pedido liberado para produção</p>
                  <p className="mt-1 text-sm leading-5 text-white/80">Sem atalhos e sem aprovação presumida.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface-subtle py-20 sm:py-28">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
              Quando algo precisa de você
            </h2>
            <p className="mt-5 max-w-[60ch] text-base leading-7 text-muted sm:text-lg">
              A conta destaca pendências antes dos pedidos que seguem normalmente. Nenhuma correção fica escondida na timeline.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-card border border-border bg-white shadow-premium">
              {[
                { icon: PixLogo, title: "Pix pendente", text: "O pagamento ainda não foi confirmado e a revisão não começou." },
                { icon: WarningCircle, title: "Correção solicitada", text: "A equipe explicou o ajuste. Envie uma nova versão pelo próprio pedido." },
                { icon: Package, title: "Pedido pronto", text: "Confira a instrução de retirada ou acompanhe o código de rastreio." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="grid gap-4 border-b border-border p-5 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                  <span className="grid size-11 place-items-center rounded-control bg-accent-soft text-accent">
                    <Icon aria-hidden size={22} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="font-black text-foreground">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                  </div>
                  <ArrowRight aria-hidden size={18} weight="bold" className="hidden text-chrome-strong sm:block" />
                </div>
              ))}
            </div>

            <aside className="rounded-card border border-accent/20 bg-accent-soft p-7 sm:p-9">
              <ClockCountdown aria-hidden size={38} weight="duotone" className="text-accent" />
              <h3 className="mt-7 text-3xl font-black tracking-[-0.035em] text-foreground">Prazo sem promessa ambígua</h3>
              <p className="mt-4 text-base leading-7 text-muted">
                Pedidos DTF de até 100 metros entram em produção em até 24 horas úteis depois do Pix confirmado e da arte aprovada.
              </p>
              <p className="mt-4 border-t border-accent/20 pt-4 text-sm leading-6 text-muted">
                Acima de 100 metros, o prazo depende da fila. Postagem, transporte e retirada são etapas separadas.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-background py-20 sm:py-28">
        <Reveal className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-card border border-accent/20 bg-surface-strong px-6 py-12 shadow-premium sm:px-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10 lg:px-14 lg:py-14">
            <div className="max-w-3xl">
              <h2 className="text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
                Pronto para começar com clareza?
              </h2>
              <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted">
                Escolha um produto ou calcule seu DTF. O site mostra o valor e a próxima ação antes de você avançar.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row lg:mt-0 lg:flex-col lg:items-stretch">
              <MarketingLink label="Ver produtos" href="/produtos" />
              <MarketingLink label="Calcular DTF" href="/dtf/textil-por-metro#calcular" variant="secondary" />
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
