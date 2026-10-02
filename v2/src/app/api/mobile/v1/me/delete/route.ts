import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { deleteUserAccount } from "@/db/queries/user-delete";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Self-service account deletion (App Store guideline 5.1.1(v): apps that
 * support account creation must let users delete the account in-app).
 * Same deleteUserAccount() cascade the admin panel uses, including its
 * safeguards (no SuperAdmin, no accounts with order history). Confirmation
 * is the typed username rather than the password, since accounts created
 * through Google/Apple sign-in have no password the user knows.
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const confirm = typeof body?.confirm === "string" ? body.confirm.trim() : "";

  const [row] = await db.select({ username: user.username }).from(user).where(eq(user.id, session.userId)).limit(1);
  if (!row) {
    return mobileJson({ status: "invalid", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }
  if (confirm.toLowerCase() !== row.username.toLowerCase()) {
    return mobileJson({ status: "invalid", message: "Onay için kullanıcı adını doğru yazmalısın." }, { status: 400 });
  }

  try {
    await deleteUserAccount(session.userId);
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Hesap silinemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
