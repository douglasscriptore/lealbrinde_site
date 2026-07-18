import path from "node:path";

export const dataDirectory = path.join(process.cwd(), ".data");
export const databasePath = path.join(dataDirectory, "lealbrinde.db");
export const uploadDirectory = path.join(dataDirectory, "uploads");
export const fiscalDirectory = path.join(dataDirectory, "fiscal-documents");
