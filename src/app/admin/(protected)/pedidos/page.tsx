import type { Metadata } from "next";

import { OrderQueue, type OrderFilter } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminOrders } from "@/server/queries/admin-operations";

export const metadata: Metadata = { title: "Pedidos" };

type OrdersPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

const statusGroups: Record<string, string[]> = {
  atencao: ["ACTION_REQUIRED", "ARTWORK_REVIEW", "CHANGES_REQUESTED"],
  correcao: ["CHANGES_REQUESTED"],
  producao: ["APPROVED", "IN_PRODUCTION"],
  retirada: ["READY_FOR_PICKUP"],
  concluidos: ["COMPLETED"],
};

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await requireStaff();
  const { q, status } = await searchParams;
  const allOrders = await getAdminOrders(q);
  const selectedStatuses = status ? statusGroups[status] : undefined;
  const orders = selectedStatuses
    ? allOrders.filter((order) => selectedStatuses.includes(order.status))
    : allOrders;
  const filters: OrderFilter[] = [
    { label: "Todos", href: "/admin/pedidos", active: !status, count: allOrders.length },
    {
      label: "Atenção",
      href: "/admin/pedidos?status=atencao",
      active: status === "atencao" || status === "correcao",
      count: allOrders.filter((order) => statusGroups.atencao.includes(order.status)).length,
    },
    {
      label: "Produção",
      href: "/admin/pedidos?status=producao",
      active: status === "producao",
      count: allOrders.filter((order) => statusGroups.producao.includes(order.status)).length,
    },
    {
      label: "Retirada",
      href: "/admin/pedidos?status=retirada",
      active: status === "retirada",
      count: allOrders.filter((order) => statusGroups.retirada.includes(order.status)).length,
    },
    {
      label: "Concluídos",
      href: "/admin/pedidos?status=concluidos",
      active: status === "concluidos",
      count: allOrders.filter((order) => statusGroups.concluidos.includes(order.status)).length,
    },
  ];

  return (
    <OrderQueue
      description="Consulte o estado independente de pagamento, arte, produção e entrega."
      filters={filters}
      orders={orders}
      query={q}
      title="Pedidos"
    />
  );
}
