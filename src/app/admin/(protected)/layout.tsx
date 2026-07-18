import type { Metadata } from "next";

import { AdminShell } from "@/components/operations";
import { requireStaff, type AppRole } from "@/server/auth/session";

import { adminLogoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Painel operacional",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const roleLabels: Record<AppRole, string> = {
  CUSTOMER: "Cliente",
  OPERATOR: "Operação",
  FINANCE: "Financeiro",
  ADMIN: "Administração",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("") || "LB";
}

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff();

  return (
    <AdminShell
      accessRole={session.role === "CUSTOMER" ? "OPERATOR" : session.role}
      description="Pedidos, produtos e filas operacionais da Leal Brinde."
      identity={{
        name: session.user.name,
        role: roleLabels[session.role],
        initials: initials(session.user.name),
      }}
      signOutAction={adminLogoutAction}
      title="Painel operacional"
    >
      {children}
    </AdminShell>
  );
}
