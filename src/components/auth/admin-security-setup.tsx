"use client";

import { CheckCircleIcon, CopyIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

type Enrollment = {
  totpURI: string;
  backupCodes: string[];
};

export function AdminSecuritySetup({ enabled }: { enabled: boolean }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [complete, setComplete] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setLoading(true);
    setError("");
    const result = await authClient.twoFactor.enable({ password, issuer: "Leal Brinde" });
    setLoading(false);

    if (result.error || !result.data?.totpURI) {
      setError("Não foi possível iniciar a configuração. Confira a senha.");
      return;
    }
    setEnrollment({
      totpURI: result.data.totpURI,
      backupCodes: result.data.backupCodes ?? [],
    });
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    setLoading(true);
    setError("");
    const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setLoading(false);
    if (result.error) {
      setError("O código não foi aceito. Confira o aplicativo e tente novamente.");
      return;
    }
    setComplete(true);
  }

  if (complete) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <CheckCircleIcon aria-hidden size={24} weight="fill" />
        <div>
          <h2 className="font-black">Segundo fator ativado</h2>
          <p className="mt-1 text-sm leading-6">Os próximos acessos com senha exigirão o código do autenticador.</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <form className="max-w-xl space-y-5" onSubmit={enable}>
        <div>
          <label className="text-sm font-bold" htmlFor="security-password">Confirme sua senha</label>
          <input
            autoComplete="current-password"
            className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
            id="security-password"
            minLength={12}
            name="password"
            required
            type="password"
          />
        </div>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-white disabled:opacity-60" disabled={loading} type="submit">
          <ShieldCheckIcon aria-hidden size={20} />
          {loading ? "Preparando" : "Ativar segundo fator"}
        </button>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-2xl border bg-slate-50 p-5">
        <h2 className="font-black">1. Adicione ao autenticador</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Abra o link em um dispositivo compatível ou copie a configuração para o aplicativo autenticador.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-bold text-white" href={enrollment.totpURI}>
            Abrir no autenticador
          </a>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"
            onClick={() => void navigator.clipboard.writeText(enrollment.totpURI).then(() => setCopied(true))}
            type="button"
          >
            <CopyIcon aria-hidden size={18} />
            {copied ? "Configuração copiada" : "Copiar configuração"}
          </button>
        </div>
      </section>

      {enrollment.backupCodes.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-black">2. Guarde os códigos de recuperação</h2>
          <p className="mt-2 text-sm">Cada código funciona uma única vez. Guarde-os fora deste computador.</p>
          <ul className="mt-4 grid gap-2 font-mono text-sm sm:grid-cols-2">
            {enrollment.backupCodes.map((code) => <li key={code}>{code}</li>)}
          </ul>
        </section>
      ) : null}

      <form className="space-y-4" onSubmit={verify}>
        <div>
          <label className="text-sm font-bold" htmlFor="enrollment-code">3. Confirme o código de 6 dígitos</label>
          <input
            autoComplete="one-time-code"
            className="mt-2 min-h-12 w-full max-w-xs rounded-xl border bg-white px-4 font-mono text-lg tracking-[0.12em]"
            id="enrollment-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            required
          />
        </div>
        <button className="inline-flex min-h-12 items-center rounded-xl bg-accent px-5 font-bold text-white disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Confirmando" : "Concluir ativação"}
        </button>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      </form>
    </div>
  );
}
