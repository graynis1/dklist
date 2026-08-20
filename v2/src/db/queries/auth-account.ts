import "server-only";
import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";

const TOKEN_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// v1's UserController::generateToken() - random_int()-based (CSPRNG), used
// for both the bearer auth token column (vestigial in v2, which uses Auth.js
// JWT sessions instead, but the column is NOT NULL so still needs a value)
// and mail-verification/password-reset codes, both security-sensitive.
// randomBytes is Node's CSPRNG, the direct equivalent of PHP's random_int().
function generateToken(length = 30): string {
  const bytes = randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
  }
  return token;
}

export interface RegisterInput {
  name: string;
  surname: string;
  username: string;
  mail: string;
  birthDate: string;
  password: string;
  sex: string;
}

export interface RegisterResult {
  userId: number;
  verificationCode: string;
}

/**
 * v1's UserController::register(). Required-field validation and username/
 * mail uniqueness match v1 exactly. v1's DirtyController profanity filter on
 * name/surname/username/mail is NOT ported here - a real but lower-priority
 * gap, noted rather than silently skipped (see PLAN.md).
 *
 * v1 emails the verification code via MyMailer/Brevo SMTP; v2 has no mail
 * transport wired up yet (the real Brevo credentials are a production
 * secret documented in the maintainer's local memory, not something to pull
 * into this dev session unasked). Real email delivery is deliberately
 * deferred - the code is returned here instead so registration is still
 * fully testable end-to-end, and login itself (see auth.ts) does not gate on
 * mailAuth the way v1's bearer-token flow did, so this doesn't block real
 * usage in the meantime.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const { name, surname, username, mail, birthDate, password, sex } = input;

  if (!name.trim() || !surname.trim() || !username.trim() || !mail.trim() || !birthDate.trim() || !sex.trim()) {
    throw new Error("Eksik bilgi gönderildi.");
  }
  if (password.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalıdır.");
  }

  for (const text of [name, surname, username, mail]) {
    if (isDirty(text)) {
      throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
    }
  }

  const [existing] = await db
    .select({ id: user.id, username: user.username, mail: user.mail })
    .from(user)
    .where(or(eq(user.username, username), eq(user.mail, mail)))
    .limit(1);

  if (existing) {
    if (existing.username === username) {
      throw new Error(`${username} kullanıcı adı kullanılıyor.`);
    }
    throw new Error(`${mail} mail adresi kullanılıyor.`);
  }

  const verificationCode = generateToken(5);
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await db.insert(user).values({
    username,
    password: passwordHash,
    mail,
    token: generateToken(),
    privacy: 0,
    userType: "Üye",
    createdDate: new Date().toISOString().slice(0, 10),
    sex,
    name,
    surname,
    birthDate,
    mailAuth: 0,
    disable: 0,
    pendingCode: verificationCode,
  });

  return { userId: result.insertId, verificationCode };
}

export async function verifyMailCode(userId: number, code: string): Promise<void> {
  const [row] = await db
    .select({ pendingCode: user.pendingCode })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row || !row.pendingCode || row.pendingCode !== code) {
    throw new Error("Doğrulama kodu yanlış.");
  }

  await db.update(user).set({ mailAuth: 1, pendingCode: null }).where(eq(user.id, userId));
}

export interface ResetPasswordRequestResult {
  userId: number;
  resetCode: string;
}

/** v1's resetPasswordRequest() accepts either a username or an email as the
 * target - matched here via the same OR lookup, then generates a reset
 * code. Same "real email deferred" note as registerUser() above applies. */
export async function requestPasswordReset(target: string): Promise<ResetPasswordRequestResult> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(or(eq(user.username, target), eq(user.mail, target)))
    .limit(1);

  if (!row) {
    throw new Error("Böyle bir hesap yok.");
  }

  const resetCode = generateToken(5);
  await db.update(user).set({ pendingCode: resetCode }).where(eq(user.id, row.id));

  return { userId: row.id, resetCode };
}

/**
 * v1's resetPassword() generates a random NEW password and emails it to the
 * user (rather than letting them pick one) - an unusual but deliberate v1
 * design, matched here. Since real email is deferred (see registerUser()),
 * the new plaintext password is returned directly instead so the reset flow
 * is still fully usable - shown once to the user, never logged or stored in
 * plaintext.
 */
export async function confirmPasswordReset(userId: number, code: string): Promise<string> {
  const [row] = await db
    .select({ pendingCode: user.pendingCode })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row || !row.pendingCode || row.pendingCode !== code) {
    throw new Error("Yanlış kod.");
  }

  const newPassword = generateToken(10);
  await db
    .update(user)
    .set({
      password: await bcrypt.hash(newPassword, 10),
      token: generateToken(),
      pendingCode: null,
      mailAuth: 1,
    })
    .where(eq(user.id, userId));

  return newPassword;
}
