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
    "bg-accent text-accent-foreground shadow-premium hover:-translate-y-1 hover:bg-accent-strong hover:shadow-premium-hover focus-visible:outline-foreground",
  secondary:
    "border border-border bg-white/90 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] hover:-translate-y-0.5 hover:border-accent/55 hover:text-accent hover:shadow-premium focus-visible:outline-accent",
  quiet:
    "px-0 text-foreground hover:text-accent focus-visible:outline-accent",
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
      className={`group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition-[transform,color,background-color,border-color,box-shadow] duration-(--duration-fast) ease-premium focus-visible:outline-2 focus-visible:outline-offset-4 active:translate-y-px active:scale-[0.98] ${variantClasses[variant]} ${className}`}
    >
      <span>{label}</span>
      {showArrow ? (
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-(--duration-fast) ease-premium group-hover:translate-x-1"
          weight="bold"
        />
      ) : null}
    </Link>
  );
}
