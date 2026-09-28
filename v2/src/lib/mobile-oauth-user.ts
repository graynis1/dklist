import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { user } from "@/db/schema";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-api";

/** Find-or-create a member by a provider-verified email (Google, Apple),
 * like registerUser() minus the password/verification-code steps - the
 * provider already verified the address - then issue a mobile token. */
export async function signInWithVerifiedEmail(email: string, name: string, surname: string) {
  const [existing] = await db.select().from(user).where(eq(user.mail, email)).limit(1);

  let row = existing;
  if (!row) {
    const baseUsername = (email.split("@")[0] || "kullanici").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) || "kullanici";
    let username = baseUsername;
    let suffix = 0;
    // A bare email local-part is not guaranteed unique against existing usernames.
    while (await db.select({ id: user.id }).from(user).where(eq(user.username, username)).limit(1).then((r) => r.length > 0)) {
      suffix += 1;
      username = `${baseUsername}${suffix}`;
    }

    const today = new Date().toISOString().slice(0, 10);
    const [result] = await db.insert(user).values({
      username,
      password: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
      mail: email,
      token: randomBytes(30).toString("hex").slice(0, 30),
      privacy: 0,
      userType: "Üye",
      createdDate: today,
      sex: "belirtmek-istemiyorum",
      name: name || "Kullanıcı",
      surname: surname || "",
      birthDate: today,
      mailAuth: 1,
      disable: 0,
    });

    const [created] = await db.select().from(user).where(eq(user.id, result.insertId)).limit(1);
    row = created;
  }

  if (!row) {
    return mobileJson({ status: "error", message: "Hesap oluşturulamadı." }, { status: 500 });
  }
  if (row.disable) {
    return mobileJson({ status: "error", message: "Bu hesap devre dışı bırakılmış." }, { status: 403 });
  }

  const token = await signMobileToken({ userId: row.id, username: row.username, userType: row.userType });
  return mobileJson({ status: "ok", token, user: { id: row.id, username: row.username, image: row.image, userType: row.userType } });
}
