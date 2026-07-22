"use client";

import { EnvelopeSimpleIcon, LockKeyIcon, PaperPlaneTiltIcon, SignInIcon, UserPlusIcon } from "@phosphor-icons/react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase-client";
import { authClient } from "@/lib/auth-client";

type FormState = "idle" | "sending" | "sent" | "error";

export function CustomerLoginForm({ callbackURL = "/minha-conta" }: { callbackURL?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const firebaseEnabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    setState("sending");
    setMessage("");
    try {
      if (!firebaseEnabled) {
        const result = await authClient.signIn.magicLink({ email, callbackURL, errorCallbackURL: "/entrar?erro=link" });
        if (result.error) throw new Error("Não foi possível enviar o link de acesso.");
        setState("sent");
        setMessage("Enviamos um link de acesso para seu e-mail.");
        return;
      }
      const auth = firebaseAuth();
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
        await sendEmailVerification(credential.user);
        await signOut(auth);
        setState("sent");
        setMessage("Conta criada. Enviamos um e-mail para confirmar seu acesso.");
        return;
      }
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await credential.user.reload();
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await signOut(auth);
        setState("sent");
        setMessage("Confirme seu e-mail. Enviamos um novo link de verificação.");
        return;
      }
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/firebase-session", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível criar sua sessão.");
      await signOut(auth);
      const destination = callbackURL.startsWith("/") && !callbackURL.startsWith("//") ? callbackURL : "/minha-conta";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar. Confira os dados.");
    }
  }

  async function recoverPassword(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email) {
      setState("error");
      setMessage("Informe seu e-mail para recuperar a senha.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth(), email);
      setState("sent");
      setMessage("Enviamos as instruções de recuperação para seu e-mail.");
    } catch {
      setState("error");
      setMessage("Não foi possível enviar a recuperação agora.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      {firebaseEnabled && mode === "register" ? (
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-semibold">Seu nome</label>
          <input id="name" name="name" required autoComplete="name" className="min-h-12 w-full rounded-control border bg-background px-4 text-foreground focus:border-accent" />
        </div>
      ) : null}
      {firebaseEnabled ? <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold">Seu e-mail</label>
        <div className="relative">
          <EnvelopeSimpleIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted focus:border-accent" />
        </div>
      </div> : null}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold">Senha</label>
        <div className="relative">
          <LockKeyIcon aria-hidden size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required className="min-h-12 w-full rounded-control border bg-background py-3 pl-12 pr-4 text-foreground focus:border-accent" />
        </div>
        {mode === "login" ? <button type="button" onClick={recoverPassword} className="text-sm font-semibold text-accent hover:underline">Esqueci minha senha</button> : null}
      </div>
      <button type="submit" disabled={state === "sending"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground disabled:opacity-60">
        {!firebaseEnabled ? <PaperPlaneTiltIcon aria-hidden size={20} weight="bold" /> : mode === "login" ? <SignInIcon aria-hidden size={20} weight="bold" /> : <UserPlusIcon aria-hidden size={20} weight="bold" />}
        {state === "sending" ? "Aguarde" : !firebaseEnabled ? "Receber link" : mode === "login" ? "Entrar" : "Criar conta"}
      </button>
      {firebaseEnabled ? <button type="button" onClick={() => { setMode((current) => current === "login" ? "register" : "login"); setState("idle"); setMessage(""); }} className="min-h-11 w-full text-sm font-bold text-accent">
        {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
      </button> : null}
      {message ? <p role="status" className={state === "error" ? "text-sm text-danger" : "text-sm text-success"}>{message}</p> : null}
    </form>
  );
}
