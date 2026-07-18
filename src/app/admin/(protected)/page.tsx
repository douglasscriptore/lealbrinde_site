import { OperationsDashboard } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminDashboardData } from "@/server/queries/admin-operations";

export default async function AdminDashboardPage() {
  const session = await requireStaff();
  const dashboard = await getAdminDashboardData();
  const queueIds =
    session.role === "FINANCE"
      ? new Set(["payment", "fiscal"])
      : session.role === "OPERATOR"
        ? new Set(["artwork-review", "changes", "production", "pickup"])
        : null;

  return (
    <OperationsDashboard
      alerts={session.role === "ADMIN" ? dashboard.alerts : []}
      operatorName={session.user.name.split(" ")[0]}
      queues={
        queueIds
          ? dashboard.queues.filter((queue) => queueIds.has(queue.id))
          : dashboard.queues
      }
      recentOrders={dashboard.recentOrders}
    />
  );
}
