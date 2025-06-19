import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import type { Database } from "./types";

export function createDatabase(): Kysely<Database> {
  const pool = createPool({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  });

  return new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });
}