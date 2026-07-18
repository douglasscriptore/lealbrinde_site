"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function CustomerSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    const result = await authClient.signOut();

    if (result.error) {
      setError("Não foi possível sair. Tente novamente.");
      setPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        onClick={signOut}
        type="button"
      >
        <SignOutIcon aria-hidden size={18} />
        {pending ? "Saindo" : "Sair"}
      </button>
      {error ? (
        <span className="text-xs font-semibold text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
