import "server-only";

import { cookies } from "next/headers";

type ApiError = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

export class LealBrindeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "LealBrindeApiError";
  }
}

export function isLealBrindeApiConfigured(): boolean {
  return Boolean(process.env.LEALBRINDE_API_URL && process.env.LEALBRINDE_SITE_API_KEY);
}

export async function lealBrindeApi<T>(
  path: `/${string}`,
  init: RequestInit & { authenticated?: boolean; forwardCookies?: boolean } = {},
): Promise<T> {
  const baseUrl = process.env.LEALBRINDE_API_URL;
  const siteApiKey = process.env.LEALBRINDE_SITE_API_KEY;
  if (!baseUrl || !siteApiKey) {
    throw new LealBrindeApiError("A API da Leal Brinde não está configurada.", 503, "API_NOT_CONFIGURED");
  }

  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-site-api-key", siteApiKey);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.authenticated || init.forwardCookies) {
    const store = await cookies();
    const forwarded = ["__session", "lb_cart"]
      .map((name) => store.get(name))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => `${item.name}=${item.value}`)
      .join("; ");
    if (forwarded) headers.set("cookie", forwarded);
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new LealBrindeApiError(
      error?.message ?? "A API não conseguiu processar a solicitação.",
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.requestId,
      error?.details,
    );
  }
  return (await response.json()) as T;
}

export async function proxyToLealBrindeApi(
  request: Request,
  path: `/${string}`,
): Promise<Response> {
  const baseUrl = process.env.LEALBRINDE_API_URL;
  const siteApiKey = process.env.LEALBRINDE_SITE_API_KEY;
  if (!baseUrl || !siteApiKey) {
    return Response.json(
      { statusCode: 503, code: "API_NOT_CONFIGURED", message: "A API da Leal Brinde não está configurada." },
      { status: 503 },
    );
  }
  const headers = new Headers();
  headers.set("accept", "application/json");
  headers.set("x-site-api-key", siteApiKey);
  for (const name of ["authorization", "content-type", "cookie", "idempotency-key", "x-request-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch(new URL(path, baseUrl), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const outgoingHeaders = new Headers();
  outgoingHeaders.set("content-type", response.headers.get("content-type") ?? "application/json");
  const requestId = response.headers.get("x-request-id");
  if (requestId) outgoingHeaders.set("x-request-id", requestId);
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie?.call(response.headers) ?? [];
  for (const cookie of setCookies) outgoingHeaders.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, headers: outgoingHeaders });
}
