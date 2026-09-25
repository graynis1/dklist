import { getStoreBySlug, isStoreFavorited, getStoreFavoriteCount, isInCart, storeImageUrl } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    return mobileJson({ status: "not_found", message: "İlan bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [favoriteCount, isFavorited, inCart] = await Promise.all([
    getStoreFavoriteCount(store.id),
    session ? isStoreFavorited(session.userId, store.id) : Promise.resolve(false),
    session ? isInCart(session.userId, store.id) : Promise.resolve(false),
  ]);

  return mobileJson({
    status: "ok",
    store: { ...store, pictures: store.pictures.map((p) => storeImageUrl(p)) },
    favoriteCount,
    isFavorited,
    inCart,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
