import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import * as relations from "./relations";

// A real persistent pool, not a per-request connection - this only works because
// the app runs as a long-lived Node process on the VPS (see the "Next.js hosting"
// decision in the v2 rewrite plan), not as ephemeral serverless functions.
//
// Stored on globalThis - the same fix already applied to event-bus.ts's
// EventEmitter for the same underlying reason: `next dev`'s HMR re-evaluates
// this module on nearly every file save, and a plain module-scope `const
// pool = ...` gets a brand-new pool (up to connectionLimit connections) each
// time, with the old pool's connections never closed. Confirmed via a real
// production incident, not a theoretical concern: after a long dev session
// (~3.5 hours, countless edits), `SHOW PROCESSLIST` against the local shadow
// DB showed 147 of 151 max_connections held open, all idle ("Sleep"), which
// then made `next build`'s parallel static-generation workers fail outright
// with "Too many connections". globalThis makes every HMR reload of this
// module reuse the same pool instead of leaking a new one.
const g = globalThis as unknown as { __dklistDbPool?: mysql.Pool };
if (!g.__dklistDbPool) {
  g.__dklistDbPool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 10,
    // book/writer/publisher rows can carry long text (content, biyo) - keep
    // dates as plain strings rather than JS Date objects to avoid timezone
    // surprises when round-tripping through mysql2.
    dateStrings: true,
  });
}
const pool = g.__dklistDbPool;

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: "default" });
