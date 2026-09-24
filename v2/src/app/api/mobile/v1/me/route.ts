import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";
import { updateProfile, setProfilePrivacy, setTwoFactorEnabled } from "@/db/queries/profile";

/** Bearer-token-gated "who am I" - the first real endpoint any signed-in
 * mobile screen will call, and a template for how every future
 * authenticated mobile route should check the session (getMobileSession,
 * 401 on null, never trust a client-supplied user id). */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      name: userTable.name,
      surname: userTable.surname,
      mail: userTable.mail,
      image: userTable.image,
      userType: userTable.userType,
      verified: userTable.verified,
    })
    .from(userTable)
    .where(eq(userTable.id, session.userId))
    .limit(1);

  if (!row) {
    return mobileJson({ status: "invalid", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  return mobileJson({ status: "ok", user: { ...row, verified: Boolean(row.verified) } });
}

/** Hesap düzenle - name/surname/sex/birthDate come back from the edit
 * screen's own initial GET (below), unchanged unless the form exposes
 * them; `privacy`/`twoFactorEnabled` are separate v1 concepts wired via
 * their own dedicated functions, not part of `updateProfile()` itself. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  try {
    if (typeof body.name === "string") {
      await updateProfile(session.userId, {
        name: body.name,
        surname: body.surname ?? "",
        sex: body.sex ?? "",
        birthDate: body.birthDate ?? "",
        biyo: body.biyo,
        livingCity: body.livingCity,
        edu: body.edu,
        job: body.job,
        password: body.password || undefined,
      });
    }
    if (typeof body.privacy === "boolean") {
      await setProfilePrivacy(session.userId, body.privacy);
    }
    let recoveryCodes: string[] | null = null;
    if (typeof body.twoFactorEnabled === "boolean") {
      recoveryCodes = await setTwoFactorEnabled(session.userId, body.twoFactorEnabled);
    }
    return mobileJson({ status: "ok", recoveryCodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profil güncellenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
