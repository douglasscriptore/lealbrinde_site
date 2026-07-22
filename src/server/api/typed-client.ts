import "server-only";

import createClient from "openapi-fetch";
import type { paths } from "./schema";

export function createLealBrindeApiClient(sessionCookie?: string) {
  const baseUrl = process.env.LEALBRINDE_API_URL;
  const apiKey = process.env.LEALBRINDE_SITE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("Configure LEALBRINDE_API_URL e LEALBRINDE_SITE_API_KEY.");
  return createClient<paths>({
    baseUrl,
    headers: {
      "x-site-api-key": apiKey,
      ...(sessionCookie ? { cookie: `__session=${sessionCookie}` } : {}),
    },
  });
}
