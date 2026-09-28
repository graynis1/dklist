import { apiFetch } from "@/api/client";
import { setStoredToken, clearStoredToken } from "@/auth/token-storage";

/** Mirrors the shapes returned by v2's `/api/mobile/v1/*` auth routes -
 * kept in sync by hand for now (no shared package between the two repos
 * yet; worth revisiting if the contract grows past a handful of fields). */
export interface MobileUser {
  id: number;
  username: string;
  image: string | null;
  userType: string;
}

export interface MobileProfile extends MobileUser {
  name: string | null;
  surname: string | null;
  mail: string;
  verified: boolean;
  /** Equipped Puan Mağazası profile frame color + its cost-derived tier -
   * see components/Avatar.tsx's FrameRing for how these render. */
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
}

type LoginResult =
  | { status: "ok"; token: string; user: MobileUser }
  | { status: "two_factor_required" }
  | { status: "suspended"; until: string };

export async function login(username: string, password: string, code?: string): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, code }),
  }).catch((err) => {
    // ApiError already carries the parsed body for the two_factor_required/
    // suspended cases (both non-2xx) - rethrow anything else (network
    // failure, 500) rather than swallowing it into a fake result shape.
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as LoginResult;
    throw err;
  });

  if (result.status === "ok") await setStoredToken(result.token);
  return result;
}

type GoogleLoginResult = { status: "ok"; token: string; user: MobileUser } | { status: "error"; message: string };

export async function googleLogin(idToken: string): Promise<GoogleLoginResult> {
  const result = await apiFetch<GoogleLoginResult>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as GoogleLoginResult;
    throw err;
  });

  if (result.status === "ok") await setStoredToken(result.token);
  return result;
}

export interface RegisterInput {
  name: string;
  surname: string;
  username: string;
  mail: string;
  birthDate: string;
  sex: string;
  password: string;
}

type RegisterResult =
  | { status: "ok"; token: string; user: MobileUser; verificationRequired: boolean; mailSent: boolean; devVerificationCode?: string }
  | { status: "error"; message: string };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const result = await apiFetch<RegisterResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as RegisterResult;
    throw err;
  });

  if (result.status === "ok") await setStoredToken(result.token);
  return result;
}

type ForgotPasswordResult = { status: "ok"; userId: number; mailSent: boolean; devResetCode?: string } | { status: "error"; message: string };

export async function requestPasswordReset(target: string): Promise<ForgotPasswordResult> {
  return apiFetch<ForgotPasswordResult>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ target }) }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as ForgotPasswordResult;
    throw err;
  });
}

type ResetPasswordResult = { status: "ok"; mailSent: boolean; devNewPassword?: string } | { status: "error"; message: string };

export async function confirmPasswordReset(userId: number, code: string): Promise<ResetPasswordResult> {
  return apiFetch<ResetPasswordResult>("/auth/reset-password", { method: "POST", body: JSON.stringify({ userId, code }) }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as ResetPasswordResult;
    throw err;
  });
}

type ResendResetCodeResult = { status: "ok"; mailSent: boolean; devResetCode?: string } | { status: "error"; message: string };

export async function resendResetCode(userId: number): Promise<ResendResetCodeResult> {
  return apiFetch<ResendResetCodeResult>("/auth/reset-password/resend", { method: "POST", body: JSON.stringify({ userId }) }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as ResendResetCodeResult;
    throw err;
  });
}

export async function logout(): Promise<void> {
  await clearStoredToken();
}

export async function getMe(): Promise<MobileProfile> {
  const result = await apiFetch<{ status: "ok"; user: MobileProfile }>("/me");
  return result.user;
}

/** identityToken from expo-apple-authentication; Apple only provides the
 * name on the first authorization, so it is forwarded for account creation. */
export async function appleLogin(identityToken: string, givenName?: string | null, familyName?: string | null): Promise<GoogleLoginResult> {
  const result = await apiFetch<GoogleLoginResult>("/auth/apple", {
    method: "POST",
    body: JSON.stringify({ identityToken, givenName: givenName ?? "", familyName: familyName ?? "" }),
  }).catch((err) => {
    if (err && typeof err === "object" && "body" in err && err.body) return err.body as GoogleLoginResult;
    throw err;
  });

  if (result.status === "ok") await setStoredToken(result.token);
  return result;
}
