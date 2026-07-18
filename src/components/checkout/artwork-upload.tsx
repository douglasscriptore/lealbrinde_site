"use client";

import {
  ArrowClockwise,
  CheckCircle,
  File,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const shouldReduceMotion = useReducedMotion();
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
        className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-border bg-[linear-gradient(145deg,var(--background),var(--surface-strong))] px-5 py-8 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-accent hover:shadow-premium focus-within:border-accent focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
      >
        <UploadSimple aria-hidden="true" size={32} weight="duotone" className="text-accent transition-transform group-hover:-translate-y-1" />
        <span className="mt-4 font-bold text-foreground">
          Selecione o arquivo pronto para impressão
        </span>
        <span className="mt-2 text-xs leading-relaxed text-muted">
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
        <AnimatePresence initial={false} mode="wait">
        {state.status === "uploading" ? (
          <motion.div
            key="uploading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-card bg-surface-strong p-4 text-sm font-semibold text-foreground"
          >
            <span className="grid size-9 place-items-center rounded-control bg-white text-accent shadow-sm">
              <UploadSimple aria-hidden="true" size={20} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              Enviando e validando o arquivo
              <span className="mt-2 block h-1.5 w-full animate-skeleton rounded-full bg-accent/25 motion-reduce:animate-none" />
            </span>
          </motion.div>
        ) : null}

        {state.status === "success" ? (
          <motion.div
            key="success"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-card border border-[color-mix(in_srgb,var(--success)_38%,var(--border))] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))] p-4"
          >
            <CheckCircle aria-hidden="true" size={23} weight="fill" className="shrink-0 text-success" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {state.asset.originalName}
              </p>
              <p className="mt-1 text-xs text-muted">
                {state.asset.detectedType}, {formatFileSize(state.asset.sizeBytes)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{state.notice}</p>
            </div>
          </motion.div>
        ) : null}

        {state.status === "error" ? (
          <motion.div
            key="error"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-start gap-3 rounded-card border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] p-4"
          >
            <Warning aria-hidden="true" size={22} weight="fill" className="shrink-0 text-danger" />
            <div>
              <p className="text-sm font-bold text-danger">Falha no envio</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{state.message}</p>
              {selectedFile ? (
                <button
                  type="button"
                  onClick={() => void upload(selectedFile)}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px"
                >
                  <ArrowClockwise aria-hidden="true" size={17} weight="bold" />
                  Tentar novamente
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {state.status === "idle" && selectedFile ? (
          <motion.div
            key="idle-file"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-card bg-surface-strong p-4"
          >
            <File aria-hidden="true" size={22} className="text-accent" />
            <p className="truncate text-sm font-semibold text-foreground">{selectedFile.name}</p>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
