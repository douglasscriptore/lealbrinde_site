"use client";

import {
  ArrowClockwise,
  CheckCircle,
  File,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CheckoutApiError,
  UploadedArtworkAsset,
  UploadArtworkResponse,
} from "./contracts";

type ArtworkUploadProps = {
  acceptedExtensions: string[];
  maximumFileSizeMb: number | null;
  uploadEndpoint?: string;
  onAssetChange: (asset: UploadedArtworkAsset | null) => void;
};

function normalizedExtensions(extensions: string[]) {
  return extensions.flatMap((extension) => {
    const clean = extension.trim().replace(/^\./, "").toLowerCase();
    if (clean === "tiff" || clean === "tif") return [".tif", ".tiff"];
    return clean ? [`.${clean}`] : [];
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArtworkUpload({
  acceptedExtensions,
  maximumFileSizeMb,
  uploadEndpoint = "/api/uploads",
  onAssetChange,
}: ArtworkUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "uploading" }
    | { status: "success"; asset: UploadedArtworkAsset; notice: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const requestRef = useRef<AbortController | null>(null);
  const accept = useMemo(
    () => Array.from(new Set(normalizedExtensions(acceptedExtensions))).join(","),
    [acceptedExtensions],
  );

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  async function upload(file: File) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    onAssetChange(null);
    setState({ status: "uploading" });

    if (maximumFileSizeMb !== null && file.size > maximumFileSizeMb * 1024 * 1024) {
      setState({ status: "error", message: `O arquivo deve ter até ${maximumFileSizeMb} MB.` });
      return;
    }

    const body = new FormData();
    body.set("artwork", file);

    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const payload = (await response.json()) as UploadArtworkResponse | CheckoutApiError;

      if (!response.ok || !("asset" in payload)) {
        throw new Error("error" in payload ? payload.error : "Não foi possível enviar o arquivo.");
      }

      onAssetChange(payload.asset);
      setState({ status: "success", asset: payload.asset, notice: payload.notice });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "Não foi possível enviar o arquivo.";
      setState({ status: "error", message });
    }
  }

  function chooseFile(file: File | null) {
    setSelectedFile(file);
    if (file) void upload(file);
  }

  return (
    <div>
      <label
        htmlFor="artwork"
        className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-5 py-8 text-center transition-colors hover:border-[var(--accent)] focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
      >
        <UploadSimple aria-hidden="true" size={32} weight="duotone" className="text-[var(--accent)]" />
        <span className="mt-4 font-bold text-[var(--foreground)]">
          Selecione o arquivo pronto para impressão
        </span>
        <span className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
          {acceptedExtensions.join(", ")}
          {maximumFileSizeMb !== null ? `, até ${maximumFileSizeMb} MB` : ""}
        </span>
        <input
          id="artwork"
          name="artwork"
          type="file"
          accept={accept || undefined}
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>

      <div aria-live="polite" className="mt-4">
        {state.status === "uploading" ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]">
            <span className="size-5 animate-pulse rounded-full bg-[var(--accent)] motion-reduce:animate-none" />
            Enviando e validando o arquivo
          </div>
        ) : null}

        {state.status === "success" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--success)_38%,var(--border))] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))] p-4">
            <CheckCircle aria-hidden="true" size={23} weight="fill" className="shrink-0 text-[var(--success)]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--foreground)]">
                {state.asset.originalName}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {state.asset.detectedType} · {formatFileSize(state.asset.sizeBytes)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{state.notice}</p>
            </div>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] p-4">
            <Warning aria-hidden="true" size={22} weight="fill" className="shrink-0 text-[var(--danger)]" />
            <div>
              <p className="text-sm font-bold text-[var(--danger)]">Falha no envio</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{state.message}</p>
              {selectedFile ? (
                <button
                  type="button"
                  onClick={() => void upload(selectedFile)}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
                >
                  <ArrowClockwise aria-hidden="true" size={17} weight="bold" />
                  Tentar novamente
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {state.status === "idle" && selectedFile ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-strong)] p-4">
            <File aria-hidden="true" size={22} className="text-[var(--accent)]" />
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{selectedFile.name}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
