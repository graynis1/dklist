import { getStoreBySlug, isStoreFavorited, getStoreFavoriteCount, isInCart, storeImageUrl, getStoreList } from "@/db/queries/store";
import { isStorePinned } from "@/db/queries/store-pin";
import { getUserSellerRating } from "@/db/queries/rating";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    return mobileJson({ status: "not_found", message: "İlan bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [favoriteCount, isFavorited, inCart, pinned, myRatingOfSeller, sellerReviews, otherListings] = await Promise.all([
    getStoreFavoriteCount(store.id),
    session ? isStoreFavorited(session.userId, store.id) : Promise.resolve(false),
    session ? isInCart(session.userId, store.id) : Promise.resolve(false),
    isStorePinned(store.id),
    session ? getUserSellerRating(session.userId, store.ownerId) : Promise.resolve(null),
    getEntityComments(store.ownerId, "user"),
    getStoreList({ ownerId: store.ownerId, excludeId: store.id, pageSize: 10 }),
  ]);
  const repliesByComment = await getRepliesForComments(sellerReviews.map((c) => c.id));
  const sellerReviewsWithReplies = sellerReviews.map((c) => ({ ...c, replies: repliesByComment.get(c.id) ?? [] }));

  return mobileJson({
    status: "ok",
    store: { ...store, pictures: store.pictures.map((p) => storeImageUrl(p)) },
    favoriteCount,
    isFavorited,
    inCart,
    pinned,
    myRatingOfSeller,
    sellerReviews: sellerReviewsWithReplies,
    otherListings: { total: otherListings.total, items: otherListings.items.map((o) => ({ ...o, image: storeImageUrl(o.image) })) },
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
