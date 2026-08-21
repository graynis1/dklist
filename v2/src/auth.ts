import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { isMailConfigured, sendTwoFactorCodeEmail } from "@/lib/mailer";

/**
 * Thrown by authorize() when a password check succeeds but the account
 * has 2FA enabled and no code was submitted yet - the client-side login
 * form (src/app/giris/page.tsx) checks this specific `code` to reveal the
 * code-entry step, rather than showing a generic "wrong credentials"
 * error. `code` ends up in the CredentialsSignin instance's own `code`
 * property (Auth.js's documented mechanism for this) - safe to expose
 * since it never distinguishes *why* a login failed, only that a second
 * step is needed after a password that already checked out.
 */
export class TwoFactorRequiredError extends CredentialsSignin {
  code = "two_factor_required";
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Auth.js only auto-trusts the request Host header on Vercel (env-detected).
  // This app self-hosts on the VPS as a long-lived Node process (see the v2
  // rewrite plan's "Next.js hosting" decision) behind Cloudflare + Caddy, so it
  // needs this set explicitly - safe here because Cloudflare is the only public
  // entry point and always sets a correct Host header for this domain.
  trustHost: true,
  session: { strategy: "jwt" },
  // No DB adapter - Auth.js's account/session/verificationToken table
  // conventions don't match this schema, and don't need to: authorize() below
  // reads the existing `user` table directly, sessions are plain JWTs. See the
  // v2 rewrite plan for why (adapter would fight the frozen, hand-verified schema).
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
        code: {},
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        const code = (credentials?.code as string | undefined)?.trim() || undefined;
        if (!username || !password) return null;

        const [row] = await db
          .select()
          .from(userTable)
          .where(eq(userTable.username, username))
          .limit(1);

        // Same generic "kullanıcı adı veya şifre hatalı" outcome for both "no such
        // user" and "wrong password" as v1's UserController::login - returning
        // null either way here does that automatically (Auth.js surfaces a single
        // generic CredentialsSignin error regardless of which branch failed).
        if (!row) return null;

        let passwordOk = await bcrypt.compare(password, row.password);

        // v1 migrated off plaintext passwords in place: any account that hasn't
        // logged in since that migration may still carry a plaintext password.
        // Replicate the exact same fallback-and-upgrade so those real accounts
        // keep working here too, instead of being silently locked out of v2.
        // Verified against the real v1 login logic (UserController::login) and
        // exercised end-to-end here on 2026-08-20 with a seeded legacy-password
        // test account.
        if (!passwordOk && password === row.password) {
          passwordOk = true;
          await db
            .update(userTable)
            .set({ password: await bcrypt.hash(password, 10) })
            .where(eq(userTable.id, row.id));
        }

        if (!passwordOk) return null;
        if (row.disable) return null;

        // 2FA gate - only reached once username+password already checked
        // out. Fails open (skips the challenge) if mail isn't configured
        // (e.g. a fresh clone with no .env.local) rather than locking the
        // user out of an account they can't complete a mailed-code
        // challenge for.
        if (row.twoFactorEnabled && isMailConfigured()) {
          if (!code) {
            const otp = generateSixDigitCode();
            // Computed and compared entirely in SQL (NOW() + INTERVAL /
            // NOW() on the read side below) rather than round-tripped
            // through JS Date parsing - a real bug caught via testing:
            // MySQL DATETIME has no timezone, but new Date() on a space-
            // separated "YYYY-MM-DD HH:MM:SS" string (no "T"/"Z") parses
            // as LOCAL time while toISOString() produces UTC, silently
            // shifting the comparison by the server's UTC offset and
            // making a freshly-generated code appear already expired.
            await db.update(userTable).set({ twoFactorCode: otp, twoFactorCodeExpires: sql`NOW() + INTERVAL 10 MINUTE` }).where(eq(userTable.id, row.id));
            await sendTwoFactorCodeEmail(row.mail, row.username, otp);
            throw new TwoFactorRequiredError();
          }

          const [validRow] = await db
            .select({ id: userTable.id })
            .from(userTable)
            .where(sql`${userTable.id} = ${row.id} AND ${userTable.twoFactorCode} = ${code} AND ${userTable.twoFactorCodeExpires} > NOW()`);
          if (!validRow) return null;

          // Consume the code so it can never be replayed.
          await db.update(userTable).set({ twoFactorCode: null, twoFactorCodeExpires: null }).where(eq(userTable.id, row.id));
        }

        return {
          id: String(row.id),
          name: row.username,
          email: row.mail,
          image: row.image,
          // Custom fields threaded through the jwt/session callbacks below -
          // not part of Auth.js's default User shape.
          userType: row.userType,
          mailAuth: Boolean(row.mailAuth),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = user.userType;
        token.mailAuth = user.mailAuth;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Auth.js sets token.sub to the id returned from authorize()
        // automatically, but does NOT copy it onto session.user.id by
        // default (only name/email/image are - id needs this explicit
        // wire-up). Found via a real bug: every page checking
        // session.user.id treated a logged-in user as signed out.
        if (token.sub) session.user.id = token.sub;
        session.user.userType = token.userType as string | undefined;
        session.user.mailAuth = token.mailAuth as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/giris",
  },
});
