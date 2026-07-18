"use client";

import type { ComponentProps, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Article,
  ChartBar,
  CurrencyCircleDollar,
  Factory,
  ImageSquare,
  List,
  LockKey,
  Package,
  PlugsConnected,
  Receipt,
  ShieldCheck,
  SignOut,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";

import type { AdminIdentity, AdminNavItem } from "./types";

type StaffRole = "OPERATOR" | "FINANCE" | "ADMIN";
type ScopedAdminNavItem = AdminNavItem & { roles: StaffRole[] };
const allStaff: StaffRole[] = ["OPERATOR", "FINANCE", "ADMIN"];

const defaultNavigation: ScopedAdminNavItem[] = [
  { label: "Visão geral", href: "/admin", icon: SquaresFour, exact: true, roles: allStaff },
  { label: "Produtos", href: "/admin/produtos", icon: Package, roles: ["ADMIN"] },
  { label: "Pedidos", href: "/admin/pedidos", icon: Receipt, roles: allStaff },
  { label: "Revisão de arte", href: "/admin/artes", icon: ImageSquare, roles: ["OPERATOR", "ADMIN"] },
  { label: "Produção", href: "/admin/producao", icon: Factory, roles: ["OPERATOR", "ADMIN"] },
  {
    label: "Financeiro",
    href: "/admin/financeiro",
    icon: CurrencyCircleDollar,
    roles: ["FINANCE", "ADMIN"],
  },
  { label: "Clientes", href: "/admin/clientes", icon: UsersThree, roles: allStaff },
  { label: "Conteúdo", href: "/admin/conteudo", icon: Article, roles: ["ADMIN"] },
  { label: "Relatórios", href: "/admin/relatorios", icon: ChartBar, roles: ["FINANCE", "ADMIN"] },
  { label: "Usuários", href: "/admin/usuarios", icon: ShieldCheck, roles: ["ADMIN"] },
  { label: "Segurança", href: "/admin/seguranca", icon: LockKey, roles: allStaff },
  { label: "Integrações", href: "/admin/integracoes", icon: PlugsConnected, roles: ["ADMIN"] },
];

export type AdminShellProps = {
  children: ReactNode;
  currentPath?: string;
  title: string;
  description?: string;
  identity: AdminIdentity;
  navigation?: AdminNavItem[];
  accessRole?: StaffRole;
  brandHref?: string;
  brandName?: string;
  signOutHref?: string;
  signOutAction?: ComponentProps<"form">["action"];
  headerAction?: ReactNode;
};

function SignOutControl({
  action,
  href,
  mobile = false,
}: {
  action?: ComponentProps<"form">["action"];
  href: string;
  mobile?: boolean;
}) {
  const classes = mobile
    ? "mt-3 flex min-h-11 w-full items-center gap-3 border-t border-slate-200 px-3 pt-3 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:border-slate-700 dark:text-slate-300"
    : "grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white";
  const content = (
    <>
      <SignOut aria-hidden="true" size={20} />
      {mobile ? "Sair" : <span className="sr-only">Sair do painel</span>}
    </>
  );

  return action ? (
    <form action={action} className={mobile ? "w-full" : undefined}>
      <button className={classes} type="submit">
        {content}
      </button>
    </form>
  ) : (
    <a aria-label={mobile ? undefined : "Sair do painel"} className={classes} href={href}>
      {content}
    </a>
  );
}

function NavigationList({
  currentPath,
  items,
}: {
  currentPath: string;
  items: AdminNavItem[];
}) {
  return (
    <nav aria-label="Navegação administrativa">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <a
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] ${
                  isActive
                    ? "bg-[#E5F8FE] text-[#006E91] dark:bg-[#073A4A] dark:text-[#72D9F7]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
                href={item.href}
              >
                <Icon aria-hidden="true" size={20} weight={isActive ? "fill" : "regular"} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span
                    aria-label={`${item.badge} pendências`}
                    className="min-w-6 rounded-full bg-slate-200 px-1.5 py-0.5 text-center text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminShell({
  children,
  currentPath,
  title,
  description,
  identity,
  navigation,
  accessRole = "ADMIN",
  brandHref = "/admin",
  brandName = "Leal Brinde",
  signOutHref = "/sair",
  signOutAction,
  headerAction,
}: AdminShellProps) {
  const pathname = usePathname();
  const resolvedPath = currentPath ?? pathname;
  const resolvedNavigation =
    navigation ?? defaultNavigation.filter((item) => item.roles.includes(accessRole));

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <a
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white focus:translate-y-0 dark:bg-white dark:text-slate-950"
        href="#conteudo-principal"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <a
          className="mb-7 flex min-h-12 items-center gap-3 rounded-xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
          href={brandHref}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[#007FA8] text-sm font-black tracking-tight text-white">
            LB
          </span>
          <span>
            <span className="block font-black tracking-tight">{brandName}</span>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Operações
            </span>
          </span>
        </a>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <NavigationList currentPath={resolvedPath} items={resolvedNavigation} />
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {identity.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{identity.name}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {identity.role}
              </span>
            </span>
            <SignOutControl action={signOutAction} href={signOutHref} />
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:static">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:hidden">
            <a className="flex items-center gap-2 font-black tracking-tight" href={brandHref}>
              <span className="grid size-9 place-items-center rounded-xl bg-[#007FA8] text-xs text-white">
                LB
              </span>
              {brandName}
            </a>
            <details className="group relative">
              <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-slate-300 bg-white text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <List aria-hidden="true" size={22} weight="bold" />
                <span className="sr-only">Abrir navegação</span>
              </summary>
              <div className="absolute right-0 top-13 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                <NavigationList currentPath={resolvedPath} items={resolvedNavigation} />
                <SignOutControl action={signOutAction} href={signOutHref} mobile />
              </div>
            </details>
          </div>

          <div className="mx-auto hidden max-w-[1500px] items-end justify-between gap-6 px-8 py-7 lg:flex">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              ) : null}
            </div>
            {headerAction}
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          id="conteudo-principal"
        >
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            ) : null}
            {headerAction ? <div className="mt-4">{headerAction}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
