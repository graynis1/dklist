import { MOBILE_API_BASE } from "@/api/config";
import { getStoredToken } from "@/auth/token-storage";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Thin fetch wrapper for `/api/mobile/v1/*` - attaches the stored Bearer
 * token automatically when present, parses the backend's consistent
 * `{status, message?, ...}` JSON shape, and throws `ApiError` on any
 * non-2xx so callers can `try/catch` instead of checking `.ok` everywhere.
 * Deliberately minimal for this infra-only phase - no retry/offline-queue
 * logic yet (the design brief's "offline durumunda kuyruklama" item is
 * real future work, not decided here).
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers = new Headers(options.headers);
  // A FormData body (multipart upload, e.g. creating a listing with
  // photos) needs its own runtime-generated boundary in Content-Type -
  // forcing application/json here would silently break every such upload.
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${MOBILE_API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body && typeof body === "object" && "message" in body && typeof body.message === "string")
      ? body.message
      : `İstek başarısız oldu (${response.status}).`;
    throw new ApiError(response.status, body, message);
  }

  return body as T;
}
