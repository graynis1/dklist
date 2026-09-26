import { getStoreBySlug } from "@/db/queries/store";
import { rateUser } from "@/db/queries/rating";
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

  const body = await request.json().catch(() => null);
  const value = Number(body?.value);

  try {
    const result = await rateUser(session.userId, store.ownerId, value);
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Puan verilemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
