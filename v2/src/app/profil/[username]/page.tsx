import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
import { ReportUserButton } from "@/components/dklist/report-user-button";
import { BlockUserButton } from "@/components/dklist/block-user-button";
import { isBlockedByMe } from "@/db/queries/blocks";
import { ReadingGoalControl } from "@/components/dklist/reading-goal-control";
import { ReadingScoreCard } from "@/components/dklist/reading-score-card";
import { VerifiedToggleButton } from "@/components/dklist/verified-toggle-button";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getBooksByStatus,
  getLibraryBooks,
  getCurrentReadingGoal,
  getPastReadingGoals,
  getReadingScoreStats,
  getUserBadges,
  getSharedReadBooks,
} from "@/db/queries/profile";
import { getLikedWriters, getLikedTranslators } from "@/db/queries/likes";
import { getUserTotalPoints, isRecentlyActive, getUserActivityHeatmap } from "@/db/queries/points";
import { ActivityHeatmap } from "@/components/dklist/activity-heatmap";
import { getBlogsByOwner } from "@/db/queries/blog";
import { READ_STATUSES } from "@/lib/reading-status";
import { getTotalReadingMinutes } from "@/db/queries/reading-status";
import { isUserPremium } from "@/db/queries/premium";

const STATUS_LABELS: Record<(typeof READ_STATUSES)[number], string> = {
  okudum: "Okudum",
  okuyorum: "Okuyorum",
  okuyacagim: "Okuyacağım",
  "yarida-birakildi": "Yarıda Bıraktım",
};

export default function ProfilePage({ params }: PageProps<"/profil/[username]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} />
      </Suspense>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

async function ProfileContent({
  params,
}: {
  params: PageProps<"/profil/[username]">["params"];
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwnProfile = viewerId === profile.id;
  const viewerIsAdmin = hasRole(session?.user?.userType, [USER_TYPES.Admin]);

  const [
    counts,
    viewerFollows,
    booksByStatus,
    libraryBooks,
    readingGoal,
    pastGoals,
    likedWriters,
    likedTranslators,
    userBadges,
    totalPoints,
    ownerBlogs,
    veteranTier,
    sharedReadBooks,
    readingScoreStats,
    totalReadingMinutes,
    isPremium,
    activityHeatmap,
    viewerHasBlocked,
  ] = await Promise.all([
    getFollowCounts(profile.id),
    viewerId && !isOwnProfile ? isFollowing(viewerId, profile.id) : Promise.resolve(false),
    getBooksByStatus(profile.id),
    getLibraryBooks(profile.id),
    getCurrentReadingGoal(profile.id),
    getPastReadingGoals(profile.id),
    getLikedWriters(profile.id),
    getLikedTranslators(profile.id),
    getUserBadges(profile.id),
    getUserTotalPoints(profile.id),
    getBlogsByOwner(profile.id, isOwnProfile),
    isRecentlyActive(profile.id),
    viewerId && !isOwnProfile ? getSharedReadBooks(viewerId, profile.id) : Promise.resolve([]),
    isOwnProfile ? getReadingScoreStats(profile.id, String(new Date().getFullYear())) : Promise.resolve(null),
    getTotalReadingMinutes(profile.id),
    isUserPremium(profile.id),
    getUserActivityHeatmap(profile.id),
    viewerId && !isOwnProfile ? isBlockedByMe(viewerId, profile.id) : Promise.resolve(false),
  ]);

  const initials = profile.username.slice(0, 2).toUpperCase();
  // Gizlilik ayarı (real behavior on the pre-existing user.privacy column) -
  // owner and existing followers always see everything; a private profile
  // hides activity/reading-status/library/badges from anyone else, same
  // as the header's own follower/following counts staying visible either
  // way (Instagram-style: basic profile info is never hidden, only content).
  const canSeeDetails = isOwnProfile || viewerFollows || !profile.privacy;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-4 flex items-center gap-6">
        <Avatar
          className="size-20 text-xl"
          style={profile.profileFrame ? { boxShadow: `0 0 0 3px ${profile.profileFrame}` } : undefined}
        >
          <AvatarImage src={avatarUrl(profile.image) ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-1.5 font-heading text-3xl font-medium tracking-tight">
            @{profile.username}
            {profile.verified && (
              <span
                title="Doğrulanmış resmi profil"
                className="inline-flex size-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white"
              >
                ✓
              </span>
            )}
            {isPremium && (
              <span
                title="DKList Premium üye"
                className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-medium text-white"
              >
                ★ Premium
              </span>
            )}
          </h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href={`/profil/${profile.username}/takipciler`} className="hover:underline">
              <strong className="text-foreground">{counts.followers}</strong>{" "}
              takipçi
            </Link>
            <Link href={`/profil/${profile.username}/takip-edilenler`} className="hover:underline">
              <strong className="text-foreground">{counts.following}</strong>{" "}
              takip
            </Link>
            <Link href="/puan-tablosu" className="hover:underline">
              <strong className="text-foreground">{totalPoints}</strong> puan
            </Link>
            {totalReadingMinutes > 0 && (
              <span>
                <strong className="text-foreground">
                  {Math.floor(totalReadingMinutes / 60)} sa {totalReadingMinutes % 60} dk
                </strong>{" "}
                okuma süresi
              </span>
            )}
          </div>
          {(userBadges.length > 0 || veteranTier) && (
            <div className="flex flex-wrap gap-1.5">
              {veteranTier && (
                <span
                  title="Son 30 gün içindeki etkinliğe göre - düşen etkinlikle kaybolabilir"
                  className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  🔥 Emekter
                </span>
              )}
              {userBadges.map((b) => (
                <span
                  key={b.id}
                  title={b.comment}
                  className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {b.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/badge-image/${b.img}`} alt="" className="size-4 rounded-full object-cover" />
                  ) : (
                    "🏅"
                  )}{" "}
                  {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {viewerId && !isOwnProfile && (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/mesajlar?user=${profile.username}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Mesaj Yaz
            </Link>
            <FollowButton targetUserId={profile.id} initialFollowing={viewerFollows} />
            <ReportUserButton targetUserId={profile.id} />
            <BlockUserButton targetUserId={profile.id} initialBlocked={viewerHasBlocked} />
            {viewerIsAdmin && (
              <VerifiedToggleButton targetUserId={profile.id} initialVerified={profile.verified} />
            )}
          </div>
        )}
        {isOwnProfile && (
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/ilanlarim" className="underline hover:text-foreground">
              İlanlarım
            </Link>
            <Link href="/favorilerim" className="underline hover:text-foreground">
              Favorilerim
            </Link>
            <Link href="/profil/duzenle" className="underline hover:text-foreground">
              Profili düzenle
            </Link>
            <Link href="/ice-aktar" className="underline hover:text-foreground">
              Goodreads&apos;ten İçe Aktar
            </Link>
          </div>
        )}
      </div>

      {profile.biyo && (
        <p className="mb-6 max-w-xl leading-relaxed text-muted-foreground">
          {profile.biyo}
        </p>
      )}

      {!canSeeDetails ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Bu hesap gizli. Okuma durumunu, kitaplığını ve etkinliğini görmek için takip et.
        </p>
      ) : (
        <>
      {activityHeatmap.length > 0 && (
        <div className="mb-6">
          <ActivityHeatmap days={activityHeatmap} />
        </div>
      )}

      {sharedReadBooks.length > 0 && (
        <p className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          İkinizin de okuduğu {sharedReadBooks.length === 1 ? "kitap" : `${sharedReadBooks.length} kitap`}:{" "}
          {sharedReadBooks.map((b, i) => (
            <span key={b.id}>
              <Link href={`/kitap/${b.slug}`} className="font-medium text-foreground hover:underline">
                {b.name}
              </Link>
              {i < sharedReadBooks.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}

      <div className="mb-10 flex flex-col gap-2">
        <ReadingGoalControl isOwnProfile={isOwnProfile} initialGoal={readingGoal} />
        {pastGoals.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Geçmiş yıllar:{" "}
            {pastGoals
              .map((g) => `${g.year}: ${g.readCount}/${g.targetCount}`)
              .join(", ")}
          </p>
        )}
        {isOwnProfile && readingScoreStats && (readingScoreStats.booksRead > 0 || readingScoreStats.totalMinutes > 0) && (
          <div className="mt-2">
            <ReadingScoreCard username={profile.username} stats={readingScoreStats} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {READ_STATUSES.map((status) => {
          const books = booksByStatus[status];
          if (books.length === 0) return null;
          return (
            <div key={status}>
              <div className="mb-3 flex items-center gap-2">
                <SectionLabel>{STATUS_LABELS[status]}</SectionLabel>
                <span className="text-sm text-muted-foreground">
                  ({books.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {books.map((b) => (
                  <Link
                    key={b.id}
                    href={`/kitap/${b.slug}`}
                    className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {READ_STATUSES.every((s) => booksByStatus[s].length === 0) && (
          <p className="text-sm text-muted-foreground">
            Henüz bir kitaba okuma durumu eklenmemiş.
          </p>
        )}

        {libraryBooks.length > 0 && (
          <div>
            {/* Deliberately its own section, not merged into the reading-status
                groups above - ownership (kitaplığım) and reading status are
                independent facts per the customer's explicit ask. */}
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Kitaplığım</SectionLabel>
              <span className="text-sm text-muted-foreground">
                ({libraryBooks.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {libraryBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/kitap/${b.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {likedWriters.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Beğenilen Yazarlar</SectionLabel>
              <span className="text-sm text-muted-foreground">({likedWriters.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {likedWriters.map((w) => (
                <Link
                  key={w.id}
                  href={`/yazar/${w.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  {w.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {likedTranslators.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Beğenilen Çevirmenler</SectionLabel>
              <span className="text-sm text-muted-foreground">({likedTranslators.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {likedTranslators.map((t) => (
                <Link
                  key={t.id}
                  href={`/cevirmen/${t.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {ownerBlogs.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Blog Yazıları</SectionLabel>
              <span className="text-sm text-muted-foreground">({ownerBlogs.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ownerBlogs.map((b) => (
                <Link
                  key={b.id}
                  href={`/blog/${b.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  {b.title}
                  {!b.approved && " (onay bekliyor)"}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
