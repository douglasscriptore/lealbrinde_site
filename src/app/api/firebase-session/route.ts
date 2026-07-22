import { isLealBrindeApiConfigured, proxyToLealBrindeApi } from "@/server/api/lealbrinde-api";

export async function POST(request: Request) {
  if (!isLealBrindeApiConfigured()) {
    return Response.json({ message: "A autenticação Firebase ainda não foi habilitada." }, { status: 503 });
  }
  return proxyToLealBrindeApi(request, "/v1/auth/session");
}

export async function DELETE(request: Request) {
  if (!isLealBrindeApiConfigured()) {
    return Response.json({ success: true });
  }
  return proxyToLealBrindeApi(request, "/v1/auth/session");
}
