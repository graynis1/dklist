import { getListBySlug, deleteReadingList } from "@/db/queries/reading-lists";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) {
    return mobileJson({ status: "not_found", message: "Liste bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const isOwner = session?.userId === list.ownerId;
  if (!list.isPublic && !isOwner) {
    return mobileJson({ status: "not_found", message: "Liste bulunamadı." }, { status: 404 });
  }

  return mobileJson({ status: "ok", list, isOwner });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) {
    return mobileJson({ status: "not_found", message: "Liste bulunamadı." }, { status: 404 });
  }

  try {
    await deleteReadingList(list.id, session.userId);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liste silinemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
