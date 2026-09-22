import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable, twoFactorRecoveryCode } from "@/db/schema";
import { isMailConfigured, sendTwoFactorCodeEmail } from "@/lib/mailer";

/**
 * The username/password/2FA/suspension check that used to live only inside
 * `auth.ts`'s NextAuth `authorize()` - extracted verbatim (same queries, same
 * order of checks, same generic-error-for-both-"no such user"-and-"wrong
 * password" behavior) so a second caller (the mobile API's Bearer-token
 * login route, see api/mobile/v1/auth/login) can run the exact same
 * security-sensitive logic instead of a hand-rolled, inevitably-drifting
 * duplicate. `auth.ts`'s `authorize()` is now a thin wrapper around this that
 * only translates the result into NextAuth's own return/throw shape - no
 * behavior change there, verified by re-reading it line by line against the
 * pre-refactor version.
 */
export type VerifiedUser = {
  id: number;
  username: string;
  mail: string;
  image: string | null;
  userType: string;
  mailAuth: boolean;
};

export type VerifyCredentialsResult =
  | { status: "ok"; user: VerifiedUser }
  | { status: "invalid" }
  | { status: "two_factor_required" }
  | { status: "suspended"; until: string };

export async function verifyCredentials(
  username: string,
  password: string,
  code?: string,
): Promise<VerifyCredentialsResult> {
  const [row] = await db.select().from(userTable).where(eq(userTable.username, username)).limit(1);

  // Same generic outcome for both "no such user" and "wrong password" as
  // v1's UserController::login - user-enumeration protection.
  if (!row) return { status: "invalid" };

  let passwordOk = await bcrypt.compare(password, row.password);

  // v1 migrated off plaintext passwords in place: any account that hasn't
  // logged in since that migration may still carry a plaintext password.
  if (!passwordOk && password === row.password) {
    passwordOk = true;
    await db
      .update(userTable)
      .set({ password: await bcrypt.hash(password, 10) })
      .where(eq(userTable.id, row.id));
  }

  if (!passwordOk) return { status: "invalid" };
  if (row.disable) return { status: "invalid" };

  if (row.suspendedUntil && new Date(row.suspendedUntil) > new Date()) {
    return { status: "suspended", until: row.suspendedUntil };
  }

  if (row.twoFactorEnabled && isMailConfigured()) {
    const trimmedCode = code?.trim() || undefined;
    if (!trimmedCode) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await db
        .update(userTable)
        .set({ twoFactorCode: otp, twoFactorCodeExpires: sql`NOW() + INTERVAL 10 MINUTE` })
        .where(eq(userTable.id, row.id));
      await sendTwoFactorCodeEmail(row.mail, row.username, otp);
      return { status: "two_factor_required" };
    }

    const [validRow] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(sql`${userTable.id} = ${row.id} AND ${userTable.twoFactorCode} = ${trimmedCode} AND ${userTable.twoFactorCodeExpires} > NOW()`);

    if (validRow) {
      await db.update(userTable).set({ twoFactorCode: null, twoFactorCodeExpires: null }).where(eq(userTable.id, row.id));
    } else {
      const unusedCodes = await db
        .select({ id: twoFactorRecoveryCode.id, codeHash: twoFactorRecoveryCode.codeHash })
        .from(twoFactorRecoveryCode)
        .where(and(eq(twoFactorRecoveryCode.userId, row.id), isNull(twoFactorRecoveryCode.usedAt)));

      let matchedId: number | null = null;
      for (const rc of unusedCodes) {
        if (await bcrypt.compare(trimmedCode, rc.codeHash)) {
          matchedId = rc.id;
          break;
        }
      }
      if (!matchedId) return { status: "invalid" };

      await db
        .update(twoFactorRecoveryCode)
        .set({ usedAt: sql`NOW()` })
        .where(eq(twoFactorRecoveryCode.id, matchedId));
    }
  }

  return {
    status: "ok",
    user: {
      id: row.id,
      username: row.username,
      mail: row.mail,
      image: row.image,
      userType: row.userType,
      mailAuth: Boolean(row.mailAuth),
    },
  };
}
