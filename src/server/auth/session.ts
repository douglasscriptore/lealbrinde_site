import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type AppRole = "CUSTOMER" | "OPERATOR" | "FINANCE" | "ADMIN";

type StaffRequirementOptions = {
  allowWithoutMfa?: boolean;
};

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session || session.user.emailVerified !== true) redirect("/entrar");
  return session;
}

export async function requireStaff(
  roles: AppRole[] = ["OPERATOR", "FINANCE", "ADMIN"],
  options: StaffRequirementOptions = {},
) {
  const session = await getCurrentSession();
  if (!session || session.user.emailVerified !== true) redirect("/admin/entrar");

  const role = (session.user as typeof session.user & { role?: AppRole }).role ?? "CUSTOMER";
  if (!roles.includes(role)) redirect("/minha-conta");

  const mfaEnabled = Boolean(
    (session.user as typeof session.user & { twoFactorEnabled?: boolean })
      .twoFactorEnabled,
  );
  if (!mfaEnabled && !options.allowWithoutMfa) redirect("/admin/seguranca");

  return { ...session, role, mfaEnabled };
}
