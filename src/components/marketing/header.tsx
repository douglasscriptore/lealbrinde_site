"use client";

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
import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";

import type { MarketingAction, MarketingImage, NavigationItem } from "./types";

type MarketingHeaderProps = {
  logo: MarketingImage;
  homeHref?: string;
  navigation: NavigationItem[];
  action: MarketingAction;
};

export function MarketingHeader({
  logo,
  homeHref = "/",
  navigation,
  action,
}: MarketingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const headerShadow = useTransform(
    scrollY,
    [0, 52],
    ["0 0 0 rgb(28 78 96 / 0)", "0 14px 40px rgb(28 78 96 / 0.1)"],
  );

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-xl"
      style={{ boxShadow: shouldReduceMotion ? undefined : headerShadow }}
    >
      <div className="mx-auto flex h-[82px] max-w-shell items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          aria-label="Leal Brinde, página inicial"
          className="inline-flex shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      isActive
                        ? "bg-surface-strong text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={action.href}
            target={action.external ? "_blank" : undefined}
            rel={action.external ? "noreferrer" : undefined}
            className="hidden min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px sm:inline-flex"
          >
            {action.label}
          </Link>

          <button
            type="button"
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            {isOpen ? <X aria-hidden="true" size={22} weight="bold" /> : <List aria-hidden="true" size={22} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={menuId}
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <nav aria-label="Navegação móvel" className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
              <ul className="grid gap-1">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={
                        (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                          ? "page"
                          : undefined
                      }
                      className="flex min-h-12 items-center rounded-control px-4 text-base font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={action.href}
                onClick={() => setIsOpen(false)}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
                className="mt-3 flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:hidden"
              >
                {action.label}
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
