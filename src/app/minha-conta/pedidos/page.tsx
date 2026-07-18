import type { Metadata } from "next";

import { CustomerDashboard } from "@/components/operations";
import { requireSession } from "@/server/auth/session";
import { getCustomerOrdersDashboard } from "@/server/queries/customer-orders";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

export default async function CustomerOrdersPage() {
  const session = await requireSession();
  const dashboard = getCustomerOrdersDashboard(session.user.email);

  return (
    <CustomerDashboard
      actions={dashboard.actions}
      activeOrders={dashboard.activeOrders}
      allOrdersHref="/minha-conta/pedidos"
      completedOrders={dashboard.completedOrders}
      completedOrdersLimit={null}
      newOrderHref="/dtf/textil-por-metro#calcular"
    />
  );
}
