import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

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

export async function OPTIONS() {
  return mobileCorsPreflight();
}
