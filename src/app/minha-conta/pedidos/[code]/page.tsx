import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetail } from "@/components/operations";
import { requireSession } from "@/server/auth/session";
import { getCustomerOrderDetail } from "@/server/queries/customer-orders";

export const metadata: Metadata = {
  title: "Detalhe do pedido",
};

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await requireSession();
  const { code } = await params;
  const order = getCustomerOrderDetail(decodeURIComponent(code), session.user.email);

  if (!order) notFound();

  return <OrderDetail order={order} />;
}
