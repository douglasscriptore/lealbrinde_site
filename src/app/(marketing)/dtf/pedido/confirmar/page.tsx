import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VerifiedPixPayment } from "@/components/checkout";
import { requireSession } from "@/server/auth/session";
import { openDatabase, OrderRepository } from "@/server/db";

export const metadata: Metadata = {
  title: "Confirmar pedido DTF",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ pedido?: string }>;
};

export default async function ConfirmDtfOrderPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const { pedido } = await searchParams;
  if (!pedido) notFound();

  const db = openDatabase();
  const order = new OrderRepository(db).findByCode(pedido);
  db.close();

  if (!order || order.customerEmail.toLowerCase() !== session.user.email.toLowerCase()) {
    notFound();
  }

  return (
    <main id="conteudo" className="page-shell py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <VerifiedPixPayment orderCode={order.code} />
      </div>
    </main>
  );
}
