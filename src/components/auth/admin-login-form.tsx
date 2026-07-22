"use client";

import { LockKeyIcon, ShieldCheckIcon, SignInIcon } from "@phosphor-icons/react";
import { FirebaseError } from "firebase/app";
import {
  getMultiFactorResolver,
  multiFactor,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  type MultiFactorResolver,
  type MultiFactorError,
  type UserCredential,
} from "firebase/auth";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { firebaseAuth } from "@/lib/firebase-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);

  async function createServerSession(credential: UserCredential) {
    const idToken = await credential.user.getIdToken(true);
    const response = await fetch("/api/firebase-session", {
      method: "POST",
      headers: { authorization: `Bearer ${idToken}` },
    });
    const payload = await response.json() as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? "A equipe não pôde iniciar a sessão.");
    await signOut(firebaseAuth());
    router.replace("/admin");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        const result = await authClient.signIn.email({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          callbackURL: "/admin",
        });
        if (result.error) throw new Error("E-mail ou senha inválidos.");
        router.push("/admin");
        router.refresh();
        return;
      }
      const auth = firebaseAuth();
      if (resolver) {
        const enrollment = resolver.hints.find((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        if (!enrollment) throw new Error("Esta conta não possui um autenticador TOTP válido.");
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(
          enrollment.uid,
          String(data.get("code") ?? "").replace(/\D/g, ""),
        );
        await createServerSession(await resolver.resolveSignIn(assertion));
        return;
      }
      const credential = await signInWithEmailAndPassword(
        auth,
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      if (!multiFactor(credential.user).enrolledFactors.length) {
        router.replace("/admin/configurar-segundo-fator");
        return;
      }
      await createServerSession(credential);
    } catch (caught) {
      if (caught instanceof FirebaseError && caught.code === "auth/multi-factor-auth-required") {
        setResolver(getMultiFactorResolver(firebaseAuth(), caught as MultiFactorError));
        setError("");
      } else {
        setError(caught instanceof Error ? caught.message : "E-mail, senha ou código inválido.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      {resolver ? (
        <div className="space-y-2">
          <label htmlFor="admin-code" className="block text-sm font-semibold">Código do autenticador</label>
          <div className="relative">
            <ShieldCheckIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input id="admin-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground" />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="admin-email" className="block text-sm font-semibold">E-mail da equipe</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" required className="min-h-12 w-full rounded-control border bg-background px-4 py-3 text-foreground" />
          </div>
          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-semibold">Senha</label>
            <div className="relative">
              <LockKeyIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={12} required className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground" />
            </div>
          </div>
        </>
      )}
      <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground disabled:opacity-60">
        <SignInIcon aria-hidden size={20} weight="bold" />
        {loading ? "Validando" : resolver ? "Confirmar segundo fator" : "Entrar no painel"}
      </button>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
