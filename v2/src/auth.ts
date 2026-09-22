import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/verify-credentials";

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

/**
 * Süreli uzaklaştırma (temporary suspension) - customer's explicit ask for
 * a time-limited ban, distinct from the existing indefinite `disable`
 * toggle. Unlike a disabled account (which returns the same generic
 * "kullanıcı adı veya şifre hatalı" as a wrong password, matching v1's
 * user-enumeration protection), a suspended user genuinely needs to know
 * *why* and *until when* - there's nothing to enumerate here, the account
 * demonstrably exists and the password just checked out. The end date is
 * packed into `code` itself (Auth.js's CredentialsSignin only reliably
 * carries this one string field through to the client, see
 * TwoFactorRequiredError's own comment above) as an ISO timestamp; the
 * client-side login form parses it back out.
 */
export class AccountSuspendedError extends CredentialsSignin {
  code: string;
  constructor(until: string) {
    super();
    this.code = `account_suspended:${until}`;
  }
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

        const result = await verifyCredentials(username, password, code);

        if (result.status === "invalid") return null;
        if (result.status === "suspended") throw new AccountSuspendedError(result.until);
        if (result.status === "two_factor_required") throw new TwoFactorRequiredError();

        const { user: row } = result;
        return {
          id: String(row.id),
          name: row.username,
          email: row.mail,
          image: row.image,
          // Custom fields threaded through the jwt/session callbacks below -
          // not part of Auth.js's default User shape.
          userType: row.userType,
          mailAuth: row.mailAuth,
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
