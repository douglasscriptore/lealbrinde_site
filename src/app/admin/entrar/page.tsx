import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = {
  title: "Acesso da equipe",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8 grid min-h-[100dvh] place-items-center py-12">
      <section className="w-full max-w-lg rounded-2xl border bg-surface p-7 shadow-premium sm:p-10">
        <Link href="/" className="text-sm font-semibold text-accent">Leal Brinde</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Painel da equipe</h1>
        <p className="mt-3 text-muted">Acesso restrito à operação, financeiro e administração.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
