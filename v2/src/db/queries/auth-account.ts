import "server-only";
import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { isMailConfigured, sendVerificationEmail, sendPasswordResetEmail, sendNewPasswordEmail } from "@/lib/mailer";

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
  mailSent: boolean;
}

/**
 * v1's UserController::register(). Required-field validation and username/
 * mail uniqueness match v1 exactly. v1's DirtyController profanity filter on
 * name/surname/username/mail is NOT ported here - a real but lower-priority
 * gap, noted rather than silently skipped (see PLAN.md).
 *
 * v1 emails the verification code via MyMailer/Brevo SMTP - v2 now does too
 * (src/lib/mailer.ts, same Brevo account). `mailSent` tells the caller
 * whether to show the code on-screen as a fallback (isMailConfigured()
 * false - e.g. a fresh clone with no .env.local) so registration stays fully
 * testable without mail. Login itself (see auth.ts) still doesn't gate on
 * mailAuth the way v1's bearer-token flow did.
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

  const mailSent = isMailConfigured();
  if (mailSent) {
    // Fire-and-forget, not awaited - registration itself (the DB insert
    // above) is already done and must not be held hostage by an SMTP round
    // trip on top of the bcrypt hash + immediate credentials sign-in this
    // same request also does. Real customer report ("bir denemeye kalktım
    // internette sorun oldu" - tried once, got some network error) is
    // consistent with all of that stacking up serially on a slow mobile
    // connection; `mailSent` here was always just "is mail configured", not
    // "confirmed delivered", so this loses no real information the caller
    // had before. Safe because this app is a long-lived Node process
    // (`next start`), not a serverless function that could be torn down
    // mid-promise - same reasoning already used for the book-embedding
    // fire-and-forget in book-admin.ts.
    void sendVerificationEmail(mail, username, verificationCode).catch((err) => {
      console.error("[register] verification email failed to send:", err);
    });
  }

  return { userId: result.insertId, verificationCode, mailSent };
}

export interface ResendVerificationResult {
  verificationCode: string;
  mailSent: boolean;
}

/**
 * Real customer-reported gap: "onay kodu gelmedi... kontrol şansımız var
 * mı?" (verification code never arrived, can we check?) - a real SMTP send
 * test confirmed Brevo genuinely accepts and queues the mail (SPF/DKIM/
 * DMARC all correctly configured on the sending domain too), so this isn't
 * a broken mail pipeline - most likely a one-off delivery hiccup or the
 * recipient's spam filter. Either way, /dogrula had no way to try again -
 * a fresh account was permanently stuck needing a re-registration. This
 * regenerates the pending code and re-sends it (or returns it for the
 * dev-mode on-screen fallback, same as registerUser()).
 */
export async function resendVerificationCode(userId: number): Promise<ResendVerificationResult> {
  const [row] = await db.select({ mail: user.mail, username: user.username, mailAuth: user.mailAuth }).from(user).where(eq(user.id, userId)).limit(1);
  if (!row) throw new Error("Kullanıcı bulunamadı.");
  if (row.mailAuth === 1) throw new Error("Hesabınız zaten doğrulanmış.");

  const verificationCode = generateToken(5);
  await db.update(user).set({ pendingCode: verificationCode }).where(eq(user.id, userId));

  const mailSent = isMailConfigured();
  if (mailSent) {
    void sendVerificationEmail(row.mail, row.username, verificationCode).catch((err) => {
      console.error("[resend-verification] email failed to send:", err);
    });
  }

  return { verificationCode, mailSent };
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
  mailSent: boolean;
}

/** v1's resetPasswordRequest() accepts either a username or an email as the
 * target - matched here via the same OR lookup, then generates a reset
 * code and emails it via the same Brevo transport as registerUser(). */
export async function requestPasswordReset(target: string): Promise<ResetPasswordRequestResult> {
  const [row] = await db
    .select({ id: user.id, username: user.username, mail: user.mail })
    .from(user)
    .where(or(eq(user.username, target), eq(user.mail, target)))
    .limit(1);

  if (!row) {
    throw new Error("Böyle bir hesap yok.");
  }

  const resetCode = generateToken(5);
  await db.update(user).set({ pendingCode: resetCode }).where(eq(user.id, row.id));

  const mailSent = isMailConfigured();
  if (mailSent) {
    // Fire-and-forget - same reasoning as registerUser()'s verification email.
    void sendPasswordResetEmail(row.mail, row.username, resetCode).catch((err) => {
      console.error("[password-reset] email failed to send:", err);
    });
  }

  return { userId: row.id, resetCode, mailSent };
}

export interface ConfirmPasswordResetResult {
  newPassword: string;
  mailSent: boolean;
}

/**
 * v1's resetPassword() generates a random NEW password and emails it to the
 * user (rather than letting them pick one) - an unusual but deliberate v1
 * design, matched here, now including the real email send. `mailSent` tells
 * the caller whether to also show the password on-screen as a fallback.
 */
export async function confirmPasswordReset(userId: number, code: string): Promise<ConfirmPasswordResetResult> {
  const [row] = await db
    .select({ pendingCode: user.pendingCode, username: user.username, mail: user.mail })
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

  const mailSent = isMailConfigured();
  if (mailSent) {
    void sendNewPasswordEmail(row.mail, row.username, newPassword).catch((err) => {
      console.error("[password-reset] new-password email failed to send:", err);
    });
  }

  return { newPassword, mailSent };
}
