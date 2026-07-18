import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CustomerSignOutButton } from "@/components/auth/customer-sign-out-button";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export default async function CustomerAccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="page-shell flex items-center justify-between gap-5 py-4">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              aria-label="Leal Brinde, página inicial"
              className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
              href="/"
            >
              <Image
                alt="Leal Brinde"
                className="h-auto w-[116px]"
                height={61}
                priority
                src="/images/leal-brinde-logo.png"
                width={116}
              />
            </Link>
            <div className="hidden min-w-0 border-l border-slate-200 pl-5 dark:border-slate-700 sm:block">
              <p className="text-sm font-black">Meus pedidos</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#006E91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:text-[#72D9F7]"
              href="/minha-conta/pedidos"
            >
              Pedidos
            </Link>
            <CustomerSignOutButton />
          </div>
        </div>
      </header>
      <main className="page-shell py-8 sm:py-12" id="conteudo">
        {children}
      </main>
    </div>
  );
}
