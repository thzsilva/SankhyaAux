import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes("user:password@localhost")) {
  throw new Error(
    "DATABASE_URL is not configured. Set DATABASE_URL in artifacts/api-server/.env to your PostgreSQL Sankhya database.",
  );
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

export * from "./schema";
