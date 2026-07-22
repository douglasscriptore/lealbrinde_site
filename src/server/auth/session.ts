import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLealBrindeApiConfigured, lealBrindeApi } from "@/server/api/lealbrinde-api";
import { auth } from "./auth";

export type AppRole = "CUSTOMER" | "OPERATOR" | "FINANCE" | "ADMIN";

type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: AppRole;
    twoFactorEnabled: boolean;
  };
};

type StaffRequirementOptions = { allowWithoutMfa?: boolean };

export async function getCurrentSession(): Promise<AppSession | null> {
  if (isLealBrindeApiConfigured()) {
    try {
      const result = await lealBrindeApi<{
        user: { uid: string; name: string; email: string | null; emailVerified: boolean; role: AppRole; mfaEnabled: boolean };
      }>("/v1/auth/me", { authenticated: true });
      if (!result.user.email) return null;
      return {
        user: {
          id: result.user.uid,
          name: result.user.name,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          role: result.user.role,
          twoFactorEnabled: result.user.mfaEnabled,
        },
      };
    } catch {
      return null;
    }
  }
  const legacy = await auth.api.getSession({ headers: await headers() });
  if (!legacy) return null;
  const user = legacy.user as typeof legacy.user & { role?: AppRole; twoFactorEnabled?: boolean };
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role ?? "CUSTOMER",
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    },
  };
}

export async function requireSession(returnTo = "/minha-conta") {
  const session = await getCurrentSession();
  if (!session || session.user.emailVerified !== true) {
    const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/minha-conta";
    redirect(`/entrar?retorno=${encodeURIComponent(safeReturnTo)}`);
  }
  return session;
}

export async function requireStaff(
  roles: AppRole[] = ["OPERATOR", "FINANCE", "ADMIN"],
  options: StaffRequirementOptions = {},
) {
  const session = await getCurrentSession();
  if (!session || session.user.emailVerified !== true) redirect("/admin/entrar");
  const role = session.user.role;
  if (!roles.includes(role)) redirect("/minha-conta");
  const mfaEnabled = session.user.twoFactorEnabled;
  if (!mfaEnabled && !options.allowWithoutMfa) redirect("/admin/seguranca");
  return { ...session, role, mfaEnabled };
}
