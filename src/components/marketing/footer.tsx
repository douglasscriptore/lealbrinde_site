import Image from "next/image";
import Link from "next/link";

import type { FooterColumn, MarketingImage, NavigationItem } from "./types";

type MarketingFooterProps = {
  logo: MarketingImage;
  description: string;
  columns: FooterColumn[];
  socialLinks?: NavigationItem[];
  legalText: string;
};

export function MarketingFooter({
  logo,
  description,
  columns,
  socialLinks = [],
  legalText,
}: MarketingFooterProps) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr] lg:gap-20">
          <div>
            <Link
              href="/"
              aria-label="Leal Brinde, página inicial"
              className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              <Image src={logo.src} alt={logo.alt} width={170} height={72} className="h-12 w-auto object-contain" />
            </Link>
            <p className="mt-6 max-w-[44ch] text-sm leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          </div>

          <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-sm font-bold text-[var(--foreground)]">{column.title}</h2>
                <ul className="mt-4 grid gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-[var(--border)] pt-7 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>{legalText}</p>
          {socialLinks.length > 0 ? (
            <nav aria-label="Redes sociais">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
