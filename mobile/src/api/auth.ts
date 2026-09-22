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

export async function logout(): Promise<void> {
  await clearStoredToken();
}

export async function getMe(): Promise<MobileProfile> {
  const result = await apiFetch<{ status: "ok"; user: MobileProfile }>("/me");
  return result.user;
}
