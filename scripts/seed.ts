import Database from "better-sqlite3";
import { loadEnvConfig } from "@next/env";

async function seedAdmin() {
  loadEnvConfig(process.cwd());
  const [{ auth }, { databasePath }] = await Promise.all([
    import("../src/server/auth/auth"),
    import("../src/server/runtime-paths"),
  ]);
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar o seed.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const database = new Database(databasePath);
  const existing = database
    .prepare("SELECT id, role, emailVerified FROM user WHERE LOWER(email) = LOWER(?)")
    .get(normalizedEmail) as
    | { id: string; role: string; emailVerified: number }
    | undefined;

  if (existing) {
    const credential = database
      .prepare(
        `SELECT id FROM account
         WHERE userId = ? AND providerId = 'credential' AND password IS NOT NULL`,
      )
      .get(existing.id);
    if (existing.role !== "ADMIN" || !credential) {
      database.close();
      throw new Error(
        "O e-mail administrativo já pertence a uma conta que não foi criada pelo bootstrap. Use outro ADMIN_EMAIL ou revise a conta manualmente.",
      );
    }
  } else {
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser({
      email: normalizedEmail,
      emailVerified: true,
      image: null,
      name: "Admin Leal Brinde",
      role: "ADMIN",
    });
    const passwordHash = await context.password.hash(password);
    await context.internalAdapter.linkAccount({
      accountId: user.id,
      password: passwordHash,
      providerId: "credential",
      userId: user.id,
    });
  }
  database.close();
}

async function main() {
  const domainSeed = await import("./seed-domain");
  await domainSeed.seedDomain();
  await seedAdmin();
  console.info("Banco inicializado com produto DTF e usuário administrativo.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
