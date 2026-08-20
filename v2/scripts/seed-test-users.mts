import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../src/db/schema";
import { user } from "../src/db/schema";

if (!process.env.DATABASE_URL?.includes("dklist_shadow")) {
  throw new Error("Refusing to seed - DATABASE_URL does not point at dklist_shadow.");
}

const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, mode: "default" });

async function main() {
  await db.execute("SET FOREIGN_KEY_CHECKS = 0");
  await db.execute("TRUNCATE TABLE `user`");
  await db.execute("SET FOREIGN_KEY_CHECKS = 1");

  const common = {
    privacy: 0,
    userType: "Üye",
    createdDate: "2026-01-01",
    sex: "unspecified",
    name: "Test",
    surname: "Kullanici",
    mailAuth: 1,
    birthDate: "1990-01-01",
    disable: 0,
  };

  // Regular case: already-migrated bcrypt password.
  await db.insert(user).values({
    username: "bcryptuser",
    password: await bcrypt.hash("sifre123", 10),
    mail: "bcryptuser@example.com",
    token: "tok1",
    ...common,
  } as never);

  // Legacy case: pre-migration plaintext password, exactly mirroring what v1's
  // real user table can still contain for accounts that haven't logged in since
  // the bcrypt migration shipped - see the fallback-and-upgrade logic in
  // src/auth.ts's authorize().
  await db.insert(user).values({
    username: "legacyuser",
    password: "plaintext456",
    mail: "legacyuser@example.com",
    token: "tok2",
    ...common,
  } as never);

  console.log("Seeded test users: bcryptuser/sifre123, legacyuser/plaintext456");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
