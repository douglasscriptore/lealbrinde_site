"use client";

import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileArrowUp,
  Factory,
  Package,
  PixLogo,
  Ruler,
  ShoppingBagOpen,
  UserCircleCheck,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

type ProcessPath = "dtf" | "products";

type ProcessStep = {
  title: string;
  summary: string;
  detail: string;
  customerAction: string;
  systemFeedback: string;
  icon: typeof Ruler;
};

const processPaths: Record<
  ProcessPath,
  { label: string; description: string; steps: ProcessStep[] }
> = {
  dtf: {
    label: "DTF por metro",
    description: "Metragem, arquivo, Pix, revisão humana e produção acompanhada.",
    steps: [
      {
        title: "Calcule a metragem",
        summary: "Informe metros inteiros e veja o total antes de avançar.",
        detail:
          "A faixa alcançada define o valor de todos os metros. O servidor confirma o cálculo novamente antes de criar o Pix.",
        customerAction: "Escolher a quantidade e conferir a faixa aplicada.",
        systemFeedback: "Preço por metro, subtotal e oportunidade da próxima faixa.",
        icon: Ruler,
      },
      {
        title: "Envie o arquivo",
        summary: "A arte entra em uma área privada e passa pela validação inicial.",
        detail:
          "O sistema verifica formato, tamanho e integridade. Um arquivo inválido não segue para pagamento até que o problema mínimo seja resolvido.",
        customerAction: "Anexar o arquivo pronto conforme o guia.",
        systemFeedback: "Confirmação do upload ou orientação clara para corrigir.",
        icon: FileArrowUp,
      },
      {
        title: "Confirme seus dados",
        summary: "Entre na conta e escolha retirada ou entrega.",
        detail:
          "Os dados do pedido e da nota fiscal são confirmados antes do pagamento. A conta guarda arquivos, documentos e histórico no mesmo lugar.",
        customerAction: "Validar contato, dados fiscais e forma de recebimento.",
        systemFeedback: "Resumo completo do pedido antes da cobrança.",
        icon: UserCircleCheck,
      },
      {
        title: "Pague com Pix",
        summary: "DTF usa Pix como forma exclusiva de pagamento.",
        detail:
          "O pedido só muda para pago depois da confirmação do pagamento. Carrinhos que também tenham um item DTF seguem a mesma regra de Pix.",
        customerAction: "Pagar o Pix dentro do prazo apresentado.",
        systemFeedback: "Confirmação do pagamento sem depender de comprovante manual.",
        icon: PixLogo,
      },
      {
        title: "Aprove a arte",
        summary: "A equipe confere o arquivo antes de liberar a produção.",
        detail:
          "Se houver um problema, você recebe uma solicitação objetiva. Cada reenvio vira uma nova versão e mantém o histórico do pedido.",
        customerAction: "Responder à correção somente quando ela for solicitada.",
        systemFeedback: "Arte aprovada ou mudanças pedidas com orientação registrada.",
        icon: CheckCircle,
      },
      {
        title: "Acompanhe até receber",
        summary: "Produção, retirada, envio e documentos aparecem na timeline.",
        detail:
          "A produção começa apenas com Pix confirmado e arte aprovada. Depois, o pedido informa quando está em produção, pronto para retirada ou enviado.",
        customerAction: "Acompanhar a timeline e aguardar a próxima atualização.",
        systemFeedback: "Estado atual, próxima ação, rastreio e documento fiscal.",
        icon: Package,
      },
    ],
  },
  products: {
    label: "Produtos e brindes",
    description: "Escolha, personalize, pague e acompanhe todos os itens do pedido.",
    steps: [
      {
        title: "Escolha o produto",
        summary: "Compare opções, variações, quantidades e disponibilidade.",
        detail:
          "Cada combinação publicada tem preço, quantidade mínima e informações próprias. O valor muda somente quando a opção ou a faixa realmente muda.",
        customerAction: "Selecionar produto, variação e quantidade.",
        systemFeedback: "Preço atualizado e disponibilidade da combinação escolhida.",
        icon: ShoppingBagOpen,
      },
      {
        title: "Defina a personalização",
        summary: "Preencha os campos ou envie a arte quando o produto pedir.",
        detail:
          "Textos, cores, observações e arquivos são salvos com o item. Qualquer acréscimo configurado aparece antes do pagamento.",
        customerAction: "Conferir exatamente o conteúdo que será personalizado.",
        systemFeedback: "Resumo da personalização e valor final do item.",
        icon: FileArrowUp,
      },
      {
        title: "Revise o carrinho",
        summary: "Entre na conta para confirmar os itens e a forma de recebimento.",
        detail:
          "O carrinho pode combinar produtos comuns e DTF. No checkout, preços, estoque e frete são verificados novamente pelo servidor.",
        customerAction: "Confirmar dados, endereço, retirada ou entrega.",
        systemFeedback: "Resumo único com todos os itens e custos.",
        icon: UserCircleCheck,
      },
      {
        title: "Faça o pagamento",
        summary: "Use Pix ou cartão quando não houver DTF no carrinho.",
        detail:
          "Se qualquer item for DTF, o pedido inteiro aceita somente Pix. Sem DTF, cartão e parcelamento aparecem quando estiverem habilitados.",
        customerAction: "Escolher uma opção disponível e concluir o pagamento.",
        systemFeedback: "Estado do pagamento atualizado na conta.",
        icon: CreditCard,
      },
      {
        title: "Acompanhe cada item",
        summary: "Personalizados podem passar por revisão antes da produção.",
        detail:
          "Arte, produção e pendências são controladas por item. Assim, uma correção não esconde o andamento dos outros produtos do pedido.",
        customerAction: "Responder apenas aos itens que pedirem atenção.",
        systemFeedback: "Situação individual de cada produto comprado.",
        icon: Factory,
      },
      {
        title: "Receba tudo junto",
        summary: "O envio é liberado quando todos os itens estiverem prontos.",
        detail:
          "Você recebe uma atualização quando o pedido completo estiver disponível para retirada ou for entregue à transportadora.",
        customerAction: "Aguardar a liberação final do pedido.",
        systemFeedback: "Retirada, rastreamento e documentos centralizados.",
        icon: Package,
      },
    ],
  },
};

export function ProcessExplorer() {
  const [activePath, setActivePath] = useState<ProcessPath>("dtf");
  const [activeStep, setActiveStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const path = processPaths[activePath];
  const step = path.steps[activeStep];
  const ActiveIcon = step.icon;

  function selectPath(pathName: ProcessPath) {
    setActivePath(pathName);
    setActiveStep(0);
  }

  return (
    <section id="fluxo" className="bg-surface-strong py-20 sm:py-28">
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Explore o processo
          </p>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.045em] text-foreground sm:text-6xl">
            Veja o que acontece em cada etapa
          </h2>
          <p className="mt-5 max-w-[60ch] text-base leading-7 text-muted sm:text-lg">
            Escolha uma jornada e toque nas etapas. Você entende sua ação, a resposta do sistema e o que libera o próximo passo.
          </p>
        </div>

        <div
          className="mt-10 inline-grid w-full grid-cols-2 rounded-card border border-border bg-white p-1.5 shadow-premium sm:w-auto"
          role="group"
          aria-label="Tipo de pedido"
        >
          {(Object.keys(processPaths) as ProcessPath[]).map((pathName) => {
            const selected = activePath === pathName;

            return (
              <button
                key={pathName}
                type="button"
                aria-pressed={selected}
                aria-controls="process-panel"
                onClick={() => selectPath(pathName)}
                className={`min-h-11 rounded-control px-4 text-sm font-bold transition-[background-color,color,box-shadow,transform] duration-(--duration-fast) ease-premium active:scale-[0.98] sm:px-6 ${
                  selected
                    ? "bg-accent text-white shadow-premium"
                    : "text-muted hover:bg-surface-strong hover:text-foreground"
                }`}
              >
                {processPaths[pathName].label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:gap-8">
          <nav aria-label={`Etapas de ${path.label}`} className="overflow-hidden rounded-card border border-border bg-white p-3 shadow-premium sm:p-4">
            <p className="px-3 pb-3 text-sm leading-6 text-muted">{path.description}</p>
            <ol className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-1">
              {path.steps.map((processStep, index) => {
                const StepIcon = processStep.icon;
                const selected = index === activeStep;

                return (
                  <li key={processStep.title} className="w-[82%] shrink-0 snap-start sm:w-auto">
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-controls="process-panel"
                      onClick={() => setActiveStep(index)}
                      className={`group flex w-full items-center gap-3 rounded-control px-3 py-3 text-left transition-[background-color,color,transform] duration-(--duration-fast) ease-premium active:scale-[0.99] ${
                        selected
                          ? "bg-accent-soft text-foreground"
                          : "text-muted hover:bg-surface-subtle hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-control border transition-colors ${
                          selected
                            ? "border-accent/25 bg-white text-accent"
                            : "border-border bg-surface-subtle text-chrome-strong group-hover:text-accent"
                        }`}
                      >
                        <StepIcon aria-hidden size={21} weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-bold leading-5">
                        {processStep.title}
                      </span>
                      <ArrowRight
                        aria-hidden
                        size={16}
                        weight="bold"
                        className={`shrink-0 transition-transform ${selected ? "translate-x-0 text-accent" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div
            id="process-panel"
            role="region"
            aria-label={`Detalhes de ${step.title}`}
            aria-live="polite"
            className="relative min-h-[31rem] overflow-hidden rounded-card border border-border bg-white shadow-premium sm:min-h-[27rem]"
          >
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activePath}-${activeStep}`}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -10 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-[31rem] flex-col p-6 sm:min-h-[27rem] sm:p-9 lg:p-11"
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-card bg-accent-soft text-accent sm:size-16">
                    <ActiveIcon aria-hidden size={30} weight="duotone" />
                  </span>
                  <span className="font-mono text-sm font-bold text-chrome-strong">
                    {String(activeStep + 1).padStart(2, "0")} / {String(path.steps.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-8 max-w-2xl">
                  <h3 className="text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-lg font-semibold leading-7 text-accent">
                    {step.summary}
                  </p>
                  <p className="mt-5 max-w-[62ch] text-base leading-7 text-muted">
                    {step.detail}
                  </p>
                </div>

                <dl className="mt-auto grid gap-3 pt-8 sm:grid-cols-2">
                  <div className="rounded-control bg-surface-subtle p-4 sm:p-5">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-chrome-strong">
                      Sua ação
                    </dt>
                    <dd className="mt-2 text-sm font-semibold leading-6 text-foreground">
                      {step.customerAction}
                    </dd>
                  </div>
                  <div className="rounded-control bg-accent-soft p-4 sm:p-5">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-accent-strong">
                      O que você vê
                    </dt>
                    <dd className="mt-2 text-sm font-semibold leading-6 text-foreground">
                      {step.systemFeedback}
                    </dd>
                  </div>
                </dl>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
