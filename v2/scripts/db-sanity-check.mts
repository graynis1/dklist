import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { category } from "../src/db/schema";

const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, mode: "default" });

const [row] = await db.execute(sql`SELECT 1 as ok`);
console.log("raw execute:", row);

const rows = await db.select().from(category).limit(3);
console.log("select from category (shadow, empty expected):", rows);

await pool.end();
console.log("OK - Drizzle client wired up correctly against dklist_shadow.");
