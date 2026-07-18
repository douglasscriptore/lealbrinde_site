"use client";

import { LockKeyIcon, SignInIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");

    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      callbackURL: "/admin",
    });

    if (result.error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <div className="space-y-2">
        <label htmlFor="admin-email" className="block text-sm font-semibold">E-mail da equipe</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-12 w-full rounded-control border bg-background px-4 py-3 text-foreground"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="admin-password" className="block text-sm font-semibold">Senha</label>
        <div className="relative">
          <LockKeyIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            required
            className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground disabled:opacity-60"
      >
        <SignInIcon aria-hidden size={20} weight="bold" />
        {loading ? "Entrando" : "Entrar no painel"}
      </button>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
