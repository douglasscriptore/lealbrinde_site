import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import type { MarketingAction } from "./types";

type MarketingLinkProps = MarketingAction & {
  variant?: "primary" | "secondary" | "quiet";
  className?: string;
  showArrow?: boolean;
};

const variantClasses = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_34px_color-mix(in_srgb,var(--accent)_24%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_color-mix(in_srgb,var(--accent)_30%,transparent)] focus-visible:outline-[var(--foreground)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-[var(--accent)]",
  quiet:
    "px-0 text-[var(--foreground)] hover:text-[var(--accent)] focus-visible:outline-[var(--accent)]",
} as const;

export function MarketingLink({
  label,
  href,
  external = false,
  variant = "primary",
  className = "",
  showArrow = true,
}: MarketingLinkProps) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition-[transform,color,background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 active:translate-y-px ${variantClasses[variant]} ${className}`}
    >
      <span>{label}</span>
      {showArrow ? (
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          weight="bold"
        />
      ) : null}
    </Link>
  );
}
