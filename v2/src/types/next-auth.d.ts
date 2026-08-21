import type { DefaultSession } from "next-auth";

// Custom fields threaded through authorize()/jwt()/session() in src/auth.ts -
// not part of Auth.js's default User/Session shape, so it needs declaring
// here for every caller to get real types instead of ad-hoc casts.
declare module "next-auth" {
  interface Session {
    user: {
      userType?: string;
      mailAuth?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    userType?: string;
    mailAuth?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType?: string;
    mailAuth?: boolean;
  }
}
