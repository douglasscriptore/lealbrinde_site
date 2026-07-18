import type { Metadata } from "next";
import Link from "next/link";

import { AdminTwoFactorForm } from "@/components/auth/admin-two-factor-form";

export const metadata: Metadata = {
  title: "Segundo fator",
  robots: { index: false, follow: false },
};

export default function AdminTwoFactorPage() {
  return (
    <main id="conteudo" className="page-shell grid min-h-[100dvh] place-items-center py-12">
      <section className="w-full max-w-lg rounded-2xl border bg-surface p-7 surface-shadow sm:p-10">
        <Link href="/" className="text-sm font-semibold text-accent">Leal Brinde</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Confirme o segundo fator</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Digite o código do aplicativo autenticador ou use um código de recuperação.
        </p>
        <AdminTwoFactorForm />
      </section>
    </main>
  );
}
