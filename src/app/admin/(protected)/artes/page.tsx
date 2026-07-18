import type { Metadata } from "next";

import { OrderQueue } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminArtworkQueue } from "@/server/queries/admin-operations";

export const metadata: Metadata = { title: "Revisão de arte" };

export default async function ArtworkQueuePage() {
  await requireStaff(["OPERATOR", "ADMIN"]);
  const orders = await getAdminArtworkQueue();

  return (
    <OrderQueue
      description="Somente a versão mais recente, paga e aprovada nas validações mínimas entra nesta fila."
      orders={orders}
      searchAction="/admin/artes"
      title="Artes para revisão"
    />
  );
}
