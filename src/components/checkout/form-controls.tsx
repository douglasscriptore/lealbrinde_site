"use client";

import type { ComponentProps, ReactNode } from "react";

type CheckoutFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function CheckoutField({
  id,
  label,
  hint,
  error,
  required,
  ...inputProps
}: CheckoutFieldProps) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 h-12 w-full rounded-control border border-border bg-background px-4 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(28_78_96/0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-muted"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type CheckoutSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function CheckoutSection({ title, description, children }: CheckoutSectionProps) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-premium sm:p-7">
      <div>
        <h2 className="text-2xl font-black tracking-[-0.025em] text-foreground">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
