import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminModulePlaceholder } from "@/components/operations";
import { requireStaff, type AppRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Módulo administrativo" };

type ModuleConfiguration = {
  title: string;
  description: string;
  capabilities: string[];
  nextStep: string;
  roles: AppRole[];
};

const modules: Record<string, ModuleConfiguration> = {
  producao: {
    title: "Produção",
    description: "Fila produtiva separada da revisão de arte e da entrega, com prioridade e bloqueios explícitos.",
    capabilities: ["Fila de pedidos aprovados", "Prazo manual conforme a política do produto", "Atualização em lote", "Histórico de movimentações"],
    nextStep: "definir uma máquina de transições monotônica antes de liberar alterações de estado.",
    roles: ["OPERATOR", "ADMIN"],
  },
  financeiro: {
    title: "Financeiro e Pix",
    description: "Reconciliação de pagamentos, divergências e documentos fiscais sem expor dados sensíveis.",
    capabilities: ["Tentativas de Pix", "Reconciliação", "Reembolsos", "Notas fiscais e recibos"],
    nextStep: "conectar o provedor Pix e o armazenamento privado de documentos.",
    roles: ["FINANCE", "ADMIN"],
  },
  clientes: {
    title: "Clientes e empresas",
    description: "Consulta de pessoas, organizações, endereços e histórico de pedidos com acesso mínimo necessário.",
    capabilities: ["Perfis de cliente", "Empresas", "Dados fiscais", "Histórico de pedidos"],
    nextStep: "criar consultas paginadas e DTOs que removam dados sensíveis por papel.",
    roles: ["OPERATOR", "FINANCE", "ADMIN"],
  },
  conteudo: {
    title: "Conteúdo",
    description: "Gerenciamento dos textos comerciais, perguntas frequentes, trabalhos reais e metadados públicos.",
    capabilities: ["Banners e textos", "Perguntas frequentes", "Trabalhos realizados", "SEO por página"],
    nextStep: "definir o modelo de conteúdo versionado e a prévia antes da publicação.",
    roles: ["ADMIN"],
  },
  relatorios: {
    title: "Relatórios",
    description: "Visões operacionais e exportações sem transformar o painel em um conjunto de métricas decorativas.",
    capabilities: ["Pedidos por período", "Tempo até aprovação", "Retirada e entrega", "Exportação CSV"],
    nextStep: "validar métricas e criar consultas agregadas sobre dados reais.",
    roles: ["FINANCE", "ADMIN"],
  },
  usuarios: {
    title: "Usuários e permissões",
    description: "Gestão dos papéis simples da operação e registro de alterações administrativas.",
    capabilities: ["Operação", "Financeiro", "Administração", "Auditoria de acessos"],
    nextStep: "implementar convites e alteração de papéis com confirmação reforçada.",
    roles: ["ADMIN"],
  },
  seguranca: {
    title: "Segurança",
    description: "Proteção das contas internas e revisão das sessões com autenticação em dois fatores.",
    capabilities: ["Ativação de TOTP", "Códigos de recuperação", "Sessões ativas", "Revogação de acesso"],
    nextStep: "concluir o fluxo de ativação e desafio MFA antes do lançamento.",
    roles: ["OPERATOR", "FINANCE", "ADMIN"],
  },
  integracoes: {
    title: "Integrações",
    description: "Saúde e configuração das portas externas sem acoplar fornecedores ao domínio.",
    capabilities: ["Pagamento Pix", "Armazenamento privado", "Notificações", "Frete e rastreamento"],
    nextStep: "selecionar provedores e configurar credenciais por ambiente.",
    roles: ["ADMIN"],
  },
};

type ModulePageProps = { params: Promise<{ modulo: string }> };

export default async function AdminModulePage({ params }: ModulePageProps) {
  const { modulo } = await params;
  const configuration = modules[modulo];
  if (!configuration) notFound();
  await requireStaff(configuration.roles);

  return <AdminModulePlaceholder {...configuration} />;
}
