import type { Metadata } from "next";
import Link from "next/link";

import { AdminSecuritySetup } from "@/components/auth/admin-security-setup";
import { requireStaff } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Segurança da conta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const session = await requireStaff(
    ["OPERATOR", "FINANCE", "ADMIN"],
    { allowWithoutMfa: true },
  );
  const enabled = session.mfaEnabled;

  return (
    <main id="conteudo" className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link className="text-sm font-bold text-accent" href="/admin">Voltar ao painel</Link>
      <header className="mt-6 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-accent">Conta da equipe</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Segundo fator de autenticação</h1>
        <p className="mt-3 leading-7 text-muted">
          Proteja o painel com um código TOTP gerado no celular. A ativação deve ser concluída por cada pessoa da equipe antes do lançamento.
        </p>
      </header>
      <section className="mt-8 rounded-2xl border bg-surface p-6 shadow-premium sm:p-8">
        <AdminSecuritySetup enabled={enabled} />
      </section>
    </main>
  );
}
