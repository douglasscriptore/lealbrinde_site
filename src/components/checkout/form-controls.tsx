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
      <label htmlFor={id} className="text-sm font-bold text-[var(--foreground)]">
        {label}
        {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-strong)] disabled:text-[var(--muted)]"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-semibold text-[var(--danger)]">
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
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
      <div>
        <h2 className="text-2xl font-black tracking-[-0.025em] text-[var(--foreground)]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
