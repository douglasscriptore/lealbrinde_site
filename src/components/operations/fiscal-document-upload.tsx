"use client";

import { FilePdfIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function FiscalDocumentUpload({ orderCode }: { orderCode: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "uploading" }
    | { status: "success" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState({ status: "uploading" });

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderCode)}/documents`,
        { method: "POST", body: new FormData(form) },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível anexar o documento.");
      }
      form.reset();
      setState({ status: "success" });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível anexar o documento.",
      });
    }
  }

  return (
    <form
      className="mt-5 space-y-4 border-t border-slate-200 pt-5"
      onSubmit={submit}
    >
      <div className="flex items-center gap-2">
        <FilePdfIcon aria-hidden size={20} className="text-accent" />
        <h3 className="text-sm font-black">Anexar documento fiscal</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Tipo de documento"
          className="min-h-11 rounded-xl border bg-white px-3 text-sm"
          name="documentType"
          required
        >
          <option value="INVOICE">Nota fiscal</option>
          <option value="RECEIPT">Recibo</option>
        </select>
        <input
          accept="application/pdf,.pdf"
          className="min-h-11 rounded-xl border bg-white p-2 text-sm"
          name="document"
          required
          type="file"
        />
      </div>
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-60"
        disabled={state.status === "uploading"}
        type="submit"
      >
        <UploadSimpleIcon aria-hidden size={18} />
        {state.status === "uploading" ? "Anexando" : "Anexar PDF"}
      </button>
      {state.status === "success" ? (
        <p className="text-sm font-bold text-emerald-700" role="status">
          Documento anexado e versionado.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-sm font-bold text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
