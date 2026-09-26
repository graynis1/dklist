import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { user } from "@/db/schema";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Real customer ask: "Google vs ile giriş de ekle" - neither the web app
 * nor the mobile app had any OAuth provider before this, only username/
 * password (see auth.ts - Credentials is NextAuth's only provider).
 * Verifies the id_token against Google's own tokeninfo endpoint (a plain
 * HTTPS call - no new server-side dependency) rather than trusting a
 * client-supplied payload, then finds-or-creates a `user` row by email,
 * exactly like registerUser() but skipping the password/verification-
 * code steps (Google has already verified the email address).
 *
 * Needs a real Google OAuth Client ID (Android + Web, from Google Cloud
 * Console) configured in the mobile app before any request ever reaches
 * this route - see mobile's LoginScreen for where that's wired.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return mobileJson({ status: "error", message: "Google kimlik bilgisi eksik." }, { status: 400 });
  }

  let payload: { email?: string; email_verified?: string; name?: string; given_name?: string; family_name?: string; aud?: string };
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new Error("invalid token");
    payload = await res.json();
  } catch {
    return mobileJson({ status: "error", message: "Google kimlik doğrulaması başarısız." }, { status: 401 });
  }

  const expectedAudiences = [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
  if (expectedAudiences.length > 0 && !expectedAudiences.includes(payload.aud)) {
    return mobileJson({ status: "error", message: "Google kimlik doğrulaması başarısız." }, { status: 401 });
  }

  const email = payload.email;
  if (!email || payload.email_verified !== "true") {
    return mobileJson({ status: "error", message: "Google hesabının e-postası doğrulanmamış." }, { status: 401 });
  }

  const [existing] = await db.select().from(user).where(eq(user.mail, email)).limit(1);

  let row = existing;
  if (!row) {
    const randomPassword = randomBytes(24).toString("hex");
    const baseUsername = (email.split("@")[0] || "kullanici").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) || "kullanici";
    let username = baseUsername;
    let suffix = 0;
    // Real collision handling, not a hopeful assumption - a bare email
    // local-part is not guaranteed unique against existing usernames.
    while (await db.select({ id: user.id }).from(user).where(eq(user.username, username)).limit(1).then((r) => r.length > 0)) {
      suffix += 1;
      username = `${baseUsername}${suffix}`;
    }

    const [result] = await db.insert(user).values({
      username,
      password: await bcrypt.hash(randomPassword, 10),
      mail: email,
      token: randomBytes(30).toString("hex").slice(0, 30),
      privacy: 0,
      userType: "Üye",
      createdDate: new Date().toISOString().slice(0, 10),
      sex: "belirtmek-istemiyorum",
      name: payload.given_name || payload.name || "Kullanıcı",
      surname: payload.family_name || "",
      birthDate: new Date().toISOString().slice(0, 10),
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

export async function OPTIONS() {
  return mobileCorsPreflight();
}
