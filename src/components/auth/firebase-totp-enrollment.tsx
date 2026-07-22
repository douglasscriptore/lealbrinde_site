"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react";
import { multiFactor, signOut, TotpMultiFactorGenerator, type TotpSecret } from "firebase/auth";
import QRCode from "qrcode";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase-client";

export function FirebaseTotpEnrollment() {
  const router = useRouter();
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = firebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      router.replace("/admin/entrar");
      return;
    }
    void (async () => {
      try {
        const generated = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
        setSecret(generated);
        setQrCode(await QRCode.toDataURL(generated.generateQrCodeUrl(user.email ?? "equipe", "Leal Brinde"), { width: 280, margin: 1 }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Não foi possível preparar o autenticador.");
      }
    })();
  }, [router]);

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secret || !firebaseAuth().currentUser) return;
    setSaving(true);
    setError("");
    try {
      const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(firebaseAuth().currentUser!).enroll(assertion, "Autenticador Leal Brinde");
      await signOut(firebaseAuth());
      router.replace("/admin/entrar?totp=configurado");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código inválido.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-premium sm:p-8">
      <ShieldCheckIcon aria-hidden size={38} weight="duotone" className="text-accent" />
      <h1 className="mt-5 text-3xl font-black tracking-tight">Proteja o acesso da equipe</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Escaneie o QR code no seu autenticador e confirme o código de seis dígitos.</p>
      {qrCode ? <Image unoptimized src={qrCode} alt="QR code para configurar o autenticador" width={280} height={280} className="mt-6 rounded-card border border-border" /> : <div className="mt-6 h-[280px] w-[280px] animate-pulse rounded-card bg-surface-strong" />}
      <form onSubmit={enroll} className="mt-6 space-y-4">
        <label className="grid gap-2 text-sm font-bold">Código do aplicativo
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="min-h-12 rounded-control border border-border px-4 text-lg tracking-[0.35em]" />
        </label>
        <button disabled={saving || !secret} className="min-h-12 w-full rounded-full bg-accent px-6 font-bold text-white disabled:opacity-60">{saving ? "Confirmando" : "Ativar segundo fator"}</button>
      </form>
      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
