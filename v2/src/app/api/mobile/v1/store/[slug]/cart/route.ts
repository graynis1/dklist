import { getStoreBySlug, toggleCartItem } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    return mobileJson({ status: "not_found", message: "İlan bulunamadı." }, { status: 404 });
  }

  const result = await toggleCartItem(session.userId, store.id);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
