import { deleteAuthorPost } from "@/db/queries/yazarhane";
import { hasRole, USER_TYPES } from "@/lib/roles";
import { getMobileSession } from "@/lib/mobile-auth";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const { id } = await params;
  const isAdmin = hasRole(await getLiveUserType(session.userId), [USER_TYPES.Admin]);
  try {
    await deleteAuthorPost(Number(id), session.userId, isAdmin);
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Silinemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
