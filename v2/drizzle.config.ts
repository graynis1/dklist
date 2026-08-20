import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Bare `dotenv/config` only loads `.env`, not Next.js's `.env.local` convention -
// this project keeps dev DB credentials in `.env.local` (gitignored) to match
// Next.js's own env-file loading elsewhere in the app.
config({ path: ".env.local" });

// Introspection-only config. Per the v2 rewrite plan (see
// C:\Users\ysf_2\.claude\plans\linked-mapping-snail.md), this project never runs
// `drizzle-kit push` or trusts `drizzle-kit generate`'s diff engine against this
// schema - schema changes are hand-written ALTER TABLE + a manually-edited schema.ts.
// `npx drizzle-kit pull` (one-time introspection snapshot) is the only command this
// config is meant to support.
export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  // Only used if `drizzle-kit pull` is deliberately re-run later (rare - schema
  // drift should be near zero once Phase 1's manual-ALTER-TABLE workflow is in
  // place). Each re-run should land in its own dated folder, never overwrite
  // src/db/schema.ts directly - diff and hand-merge instead.
  out: "./src/db/snapshots/_pull-scratch",
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
});
