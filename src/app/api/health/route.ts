import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
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

  const unsafeProductionConfiguration =
    production &&
    (checks.payments === "mock" ||
      checks.uploads === "local" ||
      checks.fileScanner === "mock-signature" ||
      checks.email === "console" ||
      checks.authentication === "missing" ||
      checks.publicUrl.includes("localhost"));

  return NextResponse.json(
    {
      status: unsafeProductionConfiguration ? "not_ready" : "ok",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: unsafeProductionConfiguration ? 503 : 200 },
  );
}
