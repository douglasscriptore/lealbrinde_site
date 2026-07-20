"use client";

import { EnvelopeSimpleIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type FormState = "idle" | "sending" | "sent" | "error";

export function CustomerLoginForm({ callbackURL = "/minha-conta" }: { callbackURL?: string }) {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();

    setState("sending");
    setMessage("");
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL,
      errorCallbackURL: "/entrar?erro=link",
    });

    if (result.error) {
      setState("error");
      setMessage("Não foi possível enviar o link. Confira o e-mail e tente novamente.");
      return;
    }

    setState("sent");
    setMessage("Enviamos um link de acesso. Em desenvolvimento, consulte o terminal do servidor.");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold">
          Seu e-mail
        </label>
        <div className="relative">
          <EnvelopeSimpleIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@empresa.com.br"
            className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted focus:border-accent"
          />
        </div>
        <p className="text-sm text-muted">Sem senha. O link expira em 10 minutos.</p>
      </div>

      <button
        type="submit"
        disabled={state === "sending" || state === "sent"}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PaperPlaneTiltIcon aria-hidden size={20} weight="bold" />
        {state === "sending" ? "Enviando link" : state === "sent" ? "Link enviado" : "Receber link"}
      </button>

      {message ? (
        <p role="status" className={state === "error" ? "text-sm text-danger" : "text-sm text-success"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
