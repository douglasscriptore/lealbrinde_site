import type { Metadata } from "next";
import Link from "next/link";
import { CustomerLoginForm } from "@/components/auth/customer-login-form";

export const metadata: Metadata = {
  title: "Acessar meus pedidos",
  robots: { index: false, follow: false },
};

export default function CustomerLoginPage() {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8 grid min-h-[100dvh] place-items-center py-12">
      <section className="w-full max-w-lg rounded-2xl border bg-surface p-7 shadow-premium sm:p-10">
        <Link href="/" className="text-sm font-semibold text-accent">Leal Brinde</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Acompanhe seu pedido</h1>
        <p className="mt-3 text-muted">Receba um link seguro para consultar arquivos, produção, entrega e documentos.</p>
        <CustomerLoginForm />
      </section>
    </main>
  );
}
