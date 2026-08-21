import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";

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
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
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
