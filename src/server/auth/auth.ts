import fs from "node:fs";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { magicLink, twoFactor } from "better-auth/plugins";
import { dataDirectory, databasePath } from "../runtime-paths";

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";
const configuredSecret = process.env.BETTER_AUTH_SECRET;

if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error("Configure BETTER_AUTH_SECRET com pelo menos 32 caracteres.");
}

export const auth = betterAuth({
  appName: "Leal Brinde",
  baseURL,
  secret:
    configuredSecret ?? "local-development-secret-change-before-production-2026",
  database,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CUSTOMER",
        input: false,
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      storeToken: "hashed",
      async sendMagicLink({ email, url }) {
        const existing = database
          .prepare("SELECT role FROM user WHERE LOWER(email) = LOWER(?)")
          .get(email) as { role?: string } | undefined;
        if (existing && ["OPERATOR", "FINANCE", "ADMIN"].includes(existing.role ?? "")) {
          throw new Error("Contas da equipe devem usar o acesso administrativo com MFA.");
        }
        if (isProduction || process.env.EMAIL_DELIVERY_MODE !== "console") {
          throw new Error("Configure um provedor de e-mail antes de enviar links em produção.");
        }

        console.info(`[Leal Brinde] Link de acesso para ${email}: ${url}`);
      },
    }),
    twoFactor({
      allowPasswordless: true,
      issuer: "Leal Brinde",
    }),
  ],
  trustedOrigins: [baseURL],
});

export type AppSession = typeof auth.$Infer.Session;
