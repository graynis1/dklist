"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type LoginResult =
  | { status: "two_factor_required" }
  | { status: "error"; message: string };

/**
 * Returns a discriminated result instead of calling redirect() on every
 * outcome - a real login success still throws internally (signIn()'s
 * own NEXT_REDIRECT convention, not an AuthError instance, so it
 * propagates straight through this catch block exactly like before this
 * function existed) and Next.js performs the navigation. The 2FA case is
 * the new one: TwoFactorRequiredError (src/auth.ts) surfaces here as a
 * CredentialsSignin with `.code === "two_factor_required"` - the client
 * form (page.tsx) uses this to reveal the code-entry step in place,
 * without a page navigation, so the already-entered password never has
 * to be resent through a URL or a cookie.
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const code = formData.get("code") ? String(formData.get("code")) : undefined;

  // Brute-force guard - keyed by IP+username so a botnet spraying many
  // usernames from one IP is still capped per-username, and a single
  // attacker hammering one real account from rotating IPs is still capped
  // by IP. No login attempt of any kind existed before this - unlimited
  // password guessing was genuinely possible.
  const ip = await getClientIp();
  if (!checkRateLimit(`login:${ip}:${username}`, 10, 5 * 60 * 1000)) {
    return { status: "error", message: "Çok fazla giriş denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  // signIn()'s options end up passed through URLSearchParams, which
  // stringifies `undefined` to the literal string "undefined" rather than
  // omitting the key - a real bug caught via testing (authorize() saw a
  // truthy "undefined" string as the code and silently failed instead of
  // ever sending a real OTP). Only include `code` in the options object
  // when it's a real value.
  const signInOptions: Record<string, string> = { username, password, redirectTo: "/" };
  if (code) signInOptions.code = code;

  try {
    await signIn("credentials", signInOptions);
    return { status: "error", message: "Beklenmeyen bir hata oluştu." }; // unreachable - signIn() throws on success too
  } catch (error) {
    if (error instanceof AuthError) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "two_factor_required") {
        return { status: "two_factor_required" };
      }
      return { status: "error", message: "Kullanıcı adı, şifre veya kod hatalı." };
    }
    throw error;
  }
}
