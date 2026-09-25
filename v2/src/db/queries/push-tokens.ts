import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { pushToken } from "@/db/schema";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Registers (or reassigns) an Expo push token for a user - called once on
 * login and again whenever the app resolves a token (Expo can rotate them).
 * `UNIQUE(token)` means a token that used to belong to a different user
 * (device changed hands, or the same install logged into a different
 * account) is reassigned to the new owner rather than left duplicated or
 * rejected - the old owner simply stops receiving pushes to that token,
 * which is the correct behavior once they're no longer signed in there.
 */
export async function registerPushToken(userId: number, token: string, platform: string): Promise<void> {
  await db
    .insert(pushToken)
    .values({ userId, token, platform, createdDate: nowSql() })
    .onDuplicateKeyUpdate({ set: { userId, platform } });
}

export async function unregisterPushToken(userId: number, token: string): Promise<void> {
  await db.delete(pushToken).where(and(eq(pushToken.userId, userId), eq(pushToken.token, token)));
}

export async function getPushTokensForUser(userId: number): Promise<string[]> {
  const rows = await db.select({ token: pushToken.token }).from(pushToken).where(eq(pushToken.userId, userId));
  return rows.map((r) => r.token);
}

/**
 * Fires a real push via Expo's push service (a plain HTTPS POST, no SDK
 * dependency needed for this) - fire-and-forget from the caller's
 * perspective (never awaited into a request's critical path, never
 * thrown from), since a push failing should never break the in-app
 * notification it's shadowing. Skips entirely when the recipient has no
 * registered device, the common case for every web-only user.
 */
export async function sendPushNotification(userId: number, title: string, body: string): Promise<void> {
  try {
    const tokens = await getPushTokensForUser(userId);
    if (tokens.length === 0) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default" }))),
    });
  } catch {
    // Best-effort - a push failure is never allowed to surface as a
    // failure of whatever real action (follow, like, message) triggered
    // the notification it's shadowing.
  }
}
