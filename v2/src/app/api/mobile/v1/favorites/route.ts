import { getLikedWriters, getLikedTranslators, getLikedPublishers } from "@/db/queries/likes";
import { getMyFavoriteStores, storeImageUrl } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Beğenilen yazar/çevirmen/yayınevi listesi - liked BOOKS don't have an
 * equivalent list query yet (only isBookLiked/toggleBookLike/count exist),
 * so this covers the three entity kinds that do; a real next step, not
 * silently dropped.
 *
 * Also includes favorited marketplace listings (getMyFavoriteStores) -
 * web's own "/favorilerim" page is actually about favorited Askıda Kitap
 * listings, a completely different feature from the writer/translator/
 * publisher likes above; mobile had never surfaced it at all. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const [writers, translators, publishers, stores] = await Promise.all([
    getLikedWriters(session.userId),
    getLikedTranslators(session.userId),
    getLikedPublishers(session.userId),
    getMyFavoriteStores(session.userId),
  ]);

  return mobileJson({
    status: "ok",
    writers,
    translators,
    publishers,
    stores: stores.map((s) => ({ ...s, image: storeImageUrl(s.image) })),
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
