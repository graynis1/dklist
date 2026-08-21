import { auth } from "@/auth";
import { getActiveAd } from "@/db/queries/advertisements";
import { advertisementImageUrl } from "@/lib/image-urls";

/** Renders nothing for a premium viewer, nothing if no active ad exists
 * for the placement, otherwise a simple image (optionally linked). Reads
 * auth() itself, so callers should wrap it in its own <Suspense> boundary
 * the same way AuthStatus/AdminNavLink do, to keep the rest of the page
 * prerenderable. `contentLanguage` (e.g. a book's `lang`) enables content-
 * language ad targeting - see getActiveAd()'s doc comment. */
export async function AdSlot({ placement, contentLanguage }: { placement: string; contentLanguage?: string }) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const ad = await getActiveAd(placement, userId, contentLanguage);
  if (!ad) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={advertisementImageUrl(ad.image)} alt="" className="w-full rounded-lg" />
  );

  return (
    <div className="mx-auto max-w-3xl px-6">
      {ad.linkUrl ? (
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored">
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}
