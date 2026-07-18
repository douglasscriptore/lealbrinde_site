"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

export function AdminTwoFactorForm() {
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") ?? "").trim();
    setLoading(true);
    setError("");

    const result =
      method === "totp"
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
        : await authClient.twoFactor.verifyBackupCode({
            code,
            trustDevice: false,
            disableSession: false,
          });

    if (result.error) {
      setError("Código inválido ou expirado.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={submit}>
      <div className="flex gap-2" role="group" aria-label="Método de verificação">
        <button
          className={`min-h-11 rounded-full border px-4 text-sm font-bold ${method === "totp" ? "border-accent bg-accent-soft text-accent-strong" : "bg-background text-muted"}`}
          onClick={() => setMethod("totp")}
          type="button"
        >
          Aplicativo
        </button>
        <button
          className={`min-h-11 rounded-full border px-4 text-sm font-bold ${method === "backup" ? "border-accent bg-accent-soft text-accent-strong" : "bg-background text-muted"}`}
          onClick={() => setMethod("backup")}
          type="button"
        >
          Código de recuperação
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold" htmlFor="two-factor-code">
          {method === "totp" ? "Código de 6 dígitos" : "Código de recuperação"}
        </label>
        <input
          autoComplete="one-time-code"
          autoFocus
          className="min-h-12 w-full rounded-control border bg-background px-4 font-mono text-lg tracking-[0.12em] text-foreground"
          id="two-factor-code"
          inputMode={method === "totp" ? "numeric" : "text"}
          maxLength={method === "totp" ? 6 : undefined}
          name="code"
          required
        />
      </div>

      <button
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-foreground disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        <ShieldCheckIcon aria-hidden size={20} weight="bold" />
        {loading ? "Verificando" : "Confirmar acesso"}
      </button>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    </form>
  );
}
