import { getLikedWriters, getLikedTranslators, getLikedPublishers } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Beğenilen yazar/çevirmen/yayınevi listesi - liked BOOKS don't have an
 * equivalent list query yet (only isBookLiked/toggleBookLike/count exist),
 * so this covers the three entity kinds that do; a real next step, not
 * silently dropped. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const [writers, translators, publishers] = await Promise.all([
    getLikedWriters(session.userId),
    getLikedTranslators(session.userId),
    getLikedPublishers(session.userId),
  ]);

  return mobileJson({ status: "ok", writers, translators, publishers });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
