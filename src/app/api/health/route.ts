import { NextResponse } from "next/server";
import { isLealBrindeApiConfigured, lealBrindeApi } from "@/server/api/lealbrinde-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const production = process.env.NODE_ENV === "production";
  const checks = {
    app: "ok",
    database: "configured",
    payments: process.env.PIX_PROVIDER ?? "mock",
    uploads: process.env.UPLOAD_PROVIDER ?? "local",
    fileScanner: process.env.FILE_SCANNER_MODE ?? "mock-signature",
    email: process.env.EMAIL_DELIVERY_MODE ?? "console",
    authentication:
      (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32 ? "configured" : "missing",
    publicUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  };

  let api: "not_configured" | "ok" | "unavailable" = "not_configured";
  if (isLealBrindeApiConfigured()) {
    try {
      await lealBrindeApi<{ status: "ok" }>("/v1/health");
      api = "ok";
    } catch {
      api = "unavailable";
    }
  }

  const unsafeProductionConfiguration =
    production &&
    (api !== "ok" ||
      checks.payments === "mock" ||
      checks.uploads === "local" ||
      checks.fileScanner === "mock-signature" ||
      checks.email === "console" ||
      checks.authentication === "missing" ||
      checks.publicUrl.includes("localhost"));

  return NextResponse.json(
    {
      status: unsafeProductionConfiguration ? "not_ready" : "ok",
      checks: { ...checks, api },
      timestamp: new Date().toISOString(),
    },
    { status: unsafeProductionConfiguration ? 503 : 200 },
  );
}
