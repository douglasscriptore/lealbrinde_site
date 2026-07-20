"use client";

import {
  House,
  IdentificationBadge,
  List,
  Package,
  Path,
  Printer,
  ShoppingCartSimple,
  Storefront,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import type { MarketingImage, NavigationItem } from "./types";

type MarketingHeaderProps = {
  logo: MarketingImage;
  homeHref?: string;
  navigation: NavigationItem[];
};

type CartPayload = {
  items?: Array<{ quantity?: number }>;
};

const mobileIcons = {
  "/": House,
  "/produtos": Storefront,
  "/dtf": Printer,
  "/pulseiras-e-cordoes": IdentificationBadge,
  "/como-funciona": Path,
} as const;

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

async function readCartCount() {
  try {
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json() as CartPayload;
    return (payload.items ?? []).reduce(
      (total, item) => total + (item.quantity ?? 0),
      0,
    );
  } catch {
    return null;
  }
}

export function MarketingHeader({
  logo,
  homeHref = "/",
  navigation,
}: MarketingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cartCount, setCartCount] = useState<number | null>(null);
  const menuId = useId();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const headerShadow = useTransform(
    scrollY,
    [0, 48],
    ["0 0 0 rgb(28 78 96 / 0)", "0 12px 34px rgb(28 78 96 / 0.1)"],
  );

  const refreshCartCount = useCallback(async () => {
    const count = await readCartCount();
    if (count !== null) setCartCount(count);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readCartCount().then((count) => {
      if (!cancelled && count !== null) setCartCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    function updateCart(event: Event) {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof count === "number") setCartCount(count);
      else void refreshCartCount();
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("focus", refreshCartCount);
    window.addEventListener("lealbrinde:cart-updated", updateCart);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("focus", refreshCartCount);
      window.removeEventListener("lealbrinde:cart-updated", updateCart);
    };
  }, [refreshCartCount]);

  const cartLabel = cartCount === null
    ? "Carrinho"
    : cartCount > 0
      ? `Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}`
      : "Carrinho vazio";

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/90 bg-white/95 backdrop-blur-xl"
      style={{ boxShadow: shouldReduceMotion ? undefined : headerShadow }}
    >
      <div className="mx-auto flex h-20 max-w-shell items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          aria-label="Leal Brinde, página inicial"
          className="mr-auto inline-flex shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent xl:mr-2"
        >
          <Image
            src={logo.src}
            alt={logo.alt}
            width={300}
            height={158}
            preload
            loading="eager"
            className="h-[57px] w-auto object-contain"
          />
        </Link>

        <nav aria-label="Navegação principal" className="hidden min-w-0 flex-1 justify-center xl:flex">
          <ul className="flex items-center gap-0.5 rounded-[14px] border border-border/80 bg-surface-strong/65 p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
            {navigation.map((item) => {
              const active = isCurrentPath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] px-3.5 text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-200 ease-premium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px ${
                      active
                        ? "bg-white text-foreground shadow-[0_6px_18px_rgb(30_75_91/0.09)]"
                        : "text-muted hover:bg-white/70 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
          <span aria-hidden className="mx-1 h-7 w-px bg-border" />
          <Link
            href="/minha-conta"
            className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-[color,background-color,transform] duration-200 ease-premium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px ${
              pathname.startsWith("/minha-conta")
                ? "bg-accent-soft text-accent-strong"
                : "text-foreground hover:bg-surface-strong"
            }`}
          >
            <UserCircle aria-hidden size={21} weight="bold" />
            Minha conta
          </Link>
          <Link
            href="/carrinho"
            aria-label={cartLabel}
            aria-current={pathname.startsWith("/carrinho") ? "page" : undefined}
            className={`relative grid size-11 place-items-center rounded-full border transition-[color,background-color,border-color,transform] duration-200 ease-premium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px ${
              pathname.startsWith("/carrinho")
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border bg-white text-foreground hover:border-accent hover:text-accent-strong"
            }`}
          >
            <ShoppingCartSimple aria-hidden size={22} weight="bold" />
            {cartCount && cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-black leading-none text-white shadow-[0_4px_12px_rgb(0_125_168/0.28)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 xl:hidden">
          <Link
            href="/carrinho"
            aria-label={cartLabel}
            className="relative grid size-11 place-items-center rounded-full border border-border bg-white text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ShoppingCartSimple aria-hidden size={22} weight="bold" />
            {cartCount && cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-black leading-none text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {isOpen ? <X aria-hidden size={22} weight="bold" /> : <List aria-hidden size={22} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-x-0 bottom-0 top-20 z-0 bg-foreground/10 backdrop-blur-[2px] xl:hidden"
            />
            <motion.div
              id={menuId}
              initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full z-10 border-t border-border bg-white shadow-[0_22px_50px_rgb(28_78_96/0.14)] xl:hidden"
            >
              <nav aria-label="Navegação móvel" className="mx-auto max-h-[calc(100dvh-5rem)] max-w-shell overflow-y-auto px-4 py-5 sm:px-6">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {navigation.map((item) => {
                    const active = isCurrentPath(pathname, item.href);
                    const Icon = mobileIcons[item.href as keyof typeof mobileIcons] ?? Package;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-13 items-center gap-3 rounded-control px-4 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active
                              ? "bg-accent-soft text-accent-strong"
                              : "text-foreground hover:bg-surface-strong"
                          }`}
                        >
                          <Icon aria-hidden size={21} weight={active ? "fill" : "bold"} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <Link
                    href="/minha-conta"
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-13 items-center gap-3 rounded-control border border-border bg-white px-4 font-bold text-foreground transition-colors hover:border-accent hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <UserCircle aria-hidden size={22} weight="bold" />
                    Minha conta
                  </Link>
                  <Link
                    href="/carrinho"
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-13 items-center gap-3 rounded-control border border-border bg-white px-4 font-bold text-foreground transition-colors hover:border-accent hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <ShoppingCartSimple aria-hidden size={22} weight="bold" />
                    Carrinho
                    {cartCount && cartCount > 0 ? (
                      <span className="ml-auto rounded-full bg-accent px-2 py-1 text-xs font-black text-white">{cartCount}</span>
                    ) : null}
                  </Link>
                </div>

              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
