import { pathToFileURL } from "node:url";

import { openDatabase, seedInitialDomain } from "../src/server/db";

export function seedDomain() {
  const db = openDatabase();
  try {
    const result = seedInitialDomain(db);
    console.log(
      `Domínio preparado. Produto: ${result.productId}. Pedidos criados: ${result.ordersCreated}.`,
    );
    return result;
  } finally {
    db.close();
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  seedDomain();
}
