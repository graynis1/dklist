import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import * as relations from "./relations";

// A real persistent pool, not a per-request connection - this only works because
// the app runs as a long-lived Node process on the VPS (see the "Next.js hosting"
// decision in the v2 rewrite plan), not as ephemeral serverless functions.
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 10,
  // book/writer/publisher rows can carry long text (content, biyo) - keep dates
  // as plain strings rather than JS Date objects to avoid timezone surprises
  // when round-tripping through mysql2.
  dateStrings: true,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: "default" });
