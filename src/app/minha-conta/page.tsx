import { CustomerDashboard } from "@/components/operations";
import { requireSession } from "@/server/auth/session";
import { getCustomerOrdersDashboard } from "@/server/queries/customer-orders";

export default async function CustomerAccountPage() {
  const session = await requireSession();
  const dashboard = getCustomerOrdersDashboard(session.user.email);

  return (
    <CustomerDashboard
      actions={dashboard.actions}
      activeOrders={dashboard.activeOrders}
      completedOrders={dashboard.completedOrders}
      customerName={firstName(session.user.name)}
      newOrderHref="/dtf/textil-por-metro#calcular"
    />
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "cliente";
}
