"use client";

import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { ArtworkUpload } from "@/components/checkout";
import type { UploadedArtworkAsset } from "@/components/checkout/contracts";

export type ArtworkResubmissionProps = {
  orderCode: string;
  acceptedExtensions: string[];
  maximumFileSizeMb: number | null;
};

export function ArtworkResubmission({
  orderCode,
  acceptedExtensions,
  maximumFileSizeMb,
}: ArtworkResubmissionProps) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "linking" }
    | { status: "success" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  function linkAsset(asset: UploadedArtworkAsset | null) {
    if (!asset) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "linking" });
    void fetch(`/api/orders/${encodeURIComponent(orderCode)}/artwork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artworkAssetId: asset.assetId }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível vincular a nova versão.");
        }
        setState({ status: "success" });
      })
      .catch((error: unknown) => {
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível vincular a nova versão.",
        });
      });
  }

  return (
    <div>
      <ArtworkUpload
        acceptedExtensions={acceptedExtensions}
        maximumFileSizeMb={maximumFileSizeMb}
        onAssetChange={linkAsset}
      />
      {state.status === "linking" ? (
        <p aria-live="polite" className="mt-5 text-sm font-bold text-slate-700">
          Vinculando a nova versão ao pedido.
        </p>
      ) : null}
      {state.status === "success" ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          role="status"
        >
          <CheckCircleIcon aria-hidden className="mt-0.5 shrink-0" size={21} weight="fill" />
          <div>
            <p className="text-sm font-black">Nova versão recebida</p>
            <p className="mt-1 text-sm leading-6">
              O arquivo foi vinculado ao pedido e passará novamente pela validação e revisão humana.
            </p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center rounded-xl font-bold underline underline-offset-4"
              href={`/minha-conta/pedidos/${encodeURIComponent(orderCode)}`}
            >
              Voltar ao pedido
            </Link>
          </div>
        </div>
      ) : null}
      {state.status === "error" ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"
          role="alert"
        >
          <WarningIcon aria-hidden className="mt-0.5 shrink-0" size={21} weight="fill" />
          <div>
            <p className="text-sm font-black">O arquivo foi enviado, mas não foi vinculado</p>
            <p className="mt-1 text-sm leading-6">{state.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
