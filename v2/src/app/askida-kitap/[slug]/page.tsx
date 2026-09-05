import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { StoreFavoriteButton } from "@/components/dklist/store-favorite-button";
import { StoreOwnerActions } from "@/components/dklist/store-owner-actions";
import { ShareAttachmentButton } from "@/components/dklist/share-attachment-button";
import { ShareButton } from "@/components/dklist/share-button";
import { StoreImageGallery } from "@/components/dklist/store-image-gallery";
import { RateEntityControl } from "@/components/dklist/rate-entity-control";
import { EntityComments } from "@/components/dklist/entity-comments";
import { auth } from "@/auth";
import {
  getStoreBySlug,
  isStoreFavorited,
  getStoreFavoriteCount,
  getStoreList,
  storeImageUrl,
} from "@/db/queries/store";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { isStorePinned } from "@/db/queries/store-pin";
import { getUserSellerRating } from "@/db/queries/rating";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { rateSellerAction, addSellerReviewAction, addSellerReviewReplyAction, shareSellerReviewAction } from "./actions";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  active: "Mevcut",
  completed: "Verildi",
  cancelled: "İptal Edildi",
};

export async function generateMetadata({ params }: PageProps<"/askida-kitap/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getStoreBySlug(slug);
  if (!listing) return {};

  return pageMetadata({
    title: listing.title,
    description: truncateDescription(listing.content || listing.title),
    path: `/askida-kitap/${listing.slug}`,
    // Tamamlanmış/iptal edilmiş ilanlar arama sonuçlarında kalmasın.
    noIndex: listing.status !== "active",
  });
}

export default function StoreDetailPage({ params }: PageProps<"/askida-kitap/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <StoreDetailContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function StoreDetailContent({
  params,
}: {
  params: PageProps<"/askida-kitap/[slug]">["params"];
}) {
  const { slug } = await params;
  const item = await getStoreBySlug(slug);

  if (!item) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isOwner = userId === item.ownerId;

  const [favorited, favoriteCount, otherListings, marketplace, myRatingOfSeller, pinned] = await Promise.all([
    userId ? isStoreFavorited(userId, item.id) : Promise.resolve(false),
    getStoreFavoriteCount(item.id),
    getStoreList({ ownerId: item.ownerId, excludeId: item.id, pageSize: 8 }),
    getMarketplaceStatus(),
    userId ? getUserSellerRating(userId, item.ownerId) : Promise.resolve(null),
    isStorePinned(item.id),
  ]);

  const sellerReviews = await getEntityComments(item.ownerId, "user");
  const sellerReviewIds = sellerReviews.map((c) => c.id);
  const [sellerRepliesByComment, sellerReviewLikes] = await Promise.all([
    getRepliesForComments(sellerReviewIds),
    getCommentLikeStates(userId, sellerReviewIds),
  ]);
  const sellerRepliesByCommentObj = Object.fromEntries(sellerRepliesByComment);

  const canBuy =
    marketplace.active &&
    item.listingType === "paid" &&
    Boolean(item.price) &&
    item.status === "active" &&
    (item.stock === null || item.stock > 0) &&
    !isOwner;

  return (
    <div className="flex flex-col gap-12">
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[320px_1fr]">
      <StoreImageGallery images={item.pictures.map((pic) => storeImageUrl(pic)!)} alt={item.title} />

      <div className={pinned ? "flex flex-col gap-4 rounded-lg border-2 border-amber-400 p-4" : "flex flex-col gap-4"}>
        <div className="flex items-center gap-2">
          <SectionLabel>{STATUS_LABELS[item.status] ?? item.status}</SectionLabel>
          {pinned && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-medium text-white">
              ★ Öne Çıkan
            </span>
          )}
        </div>
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
          {item.title}
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/profil/${item.ownerUsername}`} className="hover:underline">
            @{item.ownerUsername}
          </Link>
          {/* Real customer report: "satıcı için satıcı puanı... İlanda ki
              isminin yanında görünmeli" - Trendyol-style. */}
          {item.ownerSellerScore != null && (
            <span className="flex items-center gap-1">
              <StarRating value={item.ownerSellerScore} />
              <span className="text-xs">
                {item.ownerSellerScore.toFixed(1)}/10 ({item.ownerSellerRatingCount})
              </span>
            </span>
          )}
          {item.location ? ` · ${item.location}` : ""}
          <span className="inline-block align-middle">
            <ShareButton content={item.title} pointsKey={`store:${item.id}`} />
          </span>
        </p>

        <p className="text-lg font-medium">
          {item.listingType === "paid" && item.price ? `${item.price} TL` : "Ücretsiz"}
        </p>

        {item.book && (
          <Link
            href={`/kitap/${item.book.slug}`}
            className="w-fit rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
          >
            📖 {item.book.name}
          </Link>
        )}

        <p className="leading-relaxed whitespace-pre-line text-foreground">{item.content}</p>

        {item.shipment && (
          <p className="text-sm text-muted-foreground">Kargo: {item.shipment}</p>
        )}

        {canBuy && (
          <Button render={<Link href={`/askida-kitap/${item.slug}/satin-al`} />} nativeButton={false} className="w-fit">
            Satın Al
          </Button>
        )}

        {!isOwner && (
          <StoreFavoriteButton
            storeId={item.id}
            signedIn={Boolean(userId)}
            initialFavorited={favorited}
            initialCount={favoriteCount}
          />
        )}
        {!isOwner && userId && <ShareAttachmentButton attachmentType="store" referencedId={item.id} />}

        {isOwner && !pinned && (
          <Button render={<Link href={`/askida-kitap/${item.slug}/one-cikar`} />} nativeButton={false} variant="outline" size="sm" className="w-fit">
            ★ İlanı Öne Çıkar
          </Button>
        )}
        {isOwner && <StoreOwnerActions storeId={item.id} status={item.status} />}
      </div>
    </div>

      {otherListings.items.length > 0 && (
        <div>
          <SectionLabel>Satıcının Diğer İlanları</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {otherListings.items.map((other) => (
              <Link
                key={other.id}
                href={`/askida-kitap/${other.slug}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                  {storeImageUrl(other.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storeImageUrl(other.image)!} alt={other.title} className="size-full object-cover" />
                  )}
                </div>
                <p className="truncate px-1 pb-1 text-sm font-medium">{other.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Real customer report: "birde satıcı için satıcı puanı... ve yorum
          kısmı olabilmeli... Trendyol ve diğerlerindeki gibi. Güven
          duyarak tercihini kendi değerlendirip karar verir ve bizi daha
          az uğraştırır." Reviews target the seller's user id, not this
          one listing - shared across everything they sell. */}
      {!isOwner && (
        <div>
          <SectionLabel>Satıcı Değerlendirmesi</SectionLabel>
          <div className="mt-4">
            <RateEntityControl
              signedIn={Boolean(userId)}
              initialUserRating={myRatingOfSeller}
              rateAction={rateSellerAction.bind(null, item.ownerId)}
            />
          </div>
        </div>
      )}
      <div>
        <SectionLabel>Satıcı Yorumları</SectionLabel>
        <div className="mt-4">
          <EntityComments
            signedIn={Boolean(userId)}
            viewerId={userId ?? undefined}
            initialComments={sellerReviews}
            initialRepliesByComment={sellerRepliesByCommentObj}
            commentLikes={sellerReviewLikes}
            addCommentAction={addSellerReviewAction.bind(null, item.ownerId, "comment")}
            addReplyAction={addSellerReviewReplyAction}
            shareCommentAction={shareSellerReviewAction}
            placeholder="Bu satıcıyla ilgili deneyimini paylaş…"
            emptyMessage="Bu satıcı için henüz bir yorum yok."
          />
        </div>
      </div>
    </div>
  );
}
