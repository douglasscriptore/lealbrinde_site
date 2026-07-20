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
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_26%),var(--surface-subtle)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 shadow-[0_10px_32px_rgb(28_78_96/0.06)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-shell items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              aria-label="Leal Brinde, página inicial"
              className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="hidden min-w-0 border-l border-border pl-5 sm:block">
              <p className="text-sm font-black">Meus pedidos</p>
              <p className="truncate text-xs text-muted">
                {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-bold text-accent-strong transition-colors hover:bg-accent-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              href="/minha-conta/pedidos"
            >
              Pedidos
            </Link>
            <CustomerSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-shell px-4 py-10 sm:px-6 sm:py-14 lg:px-8" id="conteudo">
        {children}
      </main>
    </div>
  );
}
