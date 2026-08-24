import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { BookCover, toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { avatarUrl } from "@/db/queries/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
import { ReportUserButton } from "@/components/dklist/report-user-button";
import { BlockUserButton } from "@/components/dklist/block-user-button";
import { isBlockedByMe } from "@/db/queries/blocks";
import { ReadingGoalControl } from "@/components/dklist/reading-goal-control";
import { ReadingScoreCard } from "@/components/dklist/reading-score-card";
import { PointsShareCard } from "@/components/dklist/points-share-card";
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
import { getLikedWriters, getLikedTranslators, getLikedPublishers } from "@/db/queries/likes";
import { getUserTotalPoints, isRecentlyActive, getUserActivityHeatmap, getUserActivityStreak, getUserWeeklyRank } from "@/db/queries/points";
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
    likedPublishers,
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
    activityStreak,
    weeklyRank,
  ] = await Promise.all([
    getFollowCounts(profile.id),
    viewerId && !isOwnProfile ? isFollowing(viewerId, profile.id) : Promise.resolve(false),
    getBooksByStatus(profile.id),
    getLibraryBooks(profile.id),
    getCurrentReadingGoal(profile.id),
    getPastReadingGoals(profile.id),
    getLikedWriters(profile.id),
    getLikedTranslators(profile.id),
    getLikedPublishers(profile.id),
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
    getUserActivityStreak(profile.id),
    isOwnProfile ? getUserWeeklyRank(profile.id) : Promise.resolve(null),
  ]);

  const initials = profile.username.slice(0, 2).toUpperCase();
  // Gizlilik ayarı (real behavior on the pre-existing user.privacy column) -
  // owner and existing followers always see everything; a private profile
  // hides activity/reading-status/library/badges from anyone else, same
  // as the header's own follower/following counts staying visible either
  // way (Instagram-style: basic profile info is never hidden, only content).
  const canSeeDetails = isOwnProfile || viewerFollows || !profile.privacy;

  const tone = TONE_STYLE[toneForId(profile.id)];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
      <div
        className="relative h-32 overflow-hidden rounded-2xl sm:h-40"
        style={{
          background: `linear-gradient(135deg, ${tone.bg} 0%, color-mix(in oklch, ${tone.bg}, black 35%) 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
        <div
          className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: tone.rule }}
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 px-1 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mt-12 flex items-end gap-4 sm:mt-0">
          <Avatar
            className="size-24 shrink-0 text-2xl ring-4 ring-background sm:size-28"
            style={{
              backgroundColor: tone.bg,
              color: tone.fg,
              boxShadow: profile.profileFrame ? `0 0 0 3px ${profile.profileFrame}` : undefined,
            }}
          >
            <AvatarImage src={avatarUrl(profile.image) ?? undefined} />
            <AvatarFallback style={{ backgroundColor: tone.bg, color: tone.fg }}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5 pb-1">
            <h1 className="flex items-center gap-1.5 font-heading text-2xl font-medium tracking-tight sm:text-3xl">
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
        </div>

        {viewerId && !isOwnProfile && (
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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

      <div className="mb-6 flex flex-wrap gap-2">
        <StatChip href={`/profil/${profile.username}/takipciler`} value={counts.followers} label="takipçi" />
        <StatChip href={`/profil/${profile.username}/takip-edilenler`} value={counts.following} label="takip" />
        <StatChip href="/puan-tablosu" value={totalPoints} label="puan" />
        {totalReadingMinutes > 0 && (
          <StatChip
            value={`${Math.floor(totalReadingMinutes / 60)}s ${totalReadingMinutes % 60}d`}
            label="okuma süresi"
          />
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
          {activityStreak > 0 && (
            <p className="mb-2 text-sm font-medium">
              🔥 {activityStreak} gün üst üste aktif
            </p>
          )}
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
        {isOwnProfile && totalPoints > 0 && (
          <div className="mt-2">
            <PointsShareCard
              username={profile.username}
              stats={{
                totalPoints,
                weeklyPoints: weeklyRank?.points ?? 0,
                weeklyRank: weeklyRank?.rank ?? null,
                streakDays: activityStreak,
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-10">
        {READ_STATUSES.map((status) => {
          const books = booksByStatus[status];
          if (books.length === 0) return null;
          return (
            <BookShelf
              key={status}
              title={STATUS_LABELS[status]}
              count={books.length}
              books={books}
            />
          );
        })}
        {READ_STATUSES.every((s) => booksByStatus[s].length === 0) && (
          <p className="text-sm text-muted-foreground">
            Henüz bir kitaba okuma durumu eklenmemiş.
          </p>
        )}

        {libraryBooks.length > 0 && (
          // Deliberately its own section, not merged into the reading-status
          // groups above - ownership (kitaplığım) and reading status are
          // independent facts per the customer's explicit ask.
          <BookShelf title="Kitaplığım" count={libraryBooks.length} books={libraryBooks} />
        )}

        {(likedWriters.length > 0 || likedTranslators.length > 0 || likedPublishers.length > 0) && (
          <div className="flex flex-col gap-6">
            {likedWriters.length > 0 && (
              <EntityChipShelf
                title="Beğenilen Yazarlar"
                count={likedWriters.length}
                items={likedWriters}
                hrefPrefix="/yazar"
              />
            )}
            {likedTranslators.length > 0 && (
              <EntityChipShelf
                title="Beğenilen Çevirmenler"
                count={likedTranslators.length}
                items={likedTranslators}
                hrefPrefix="/cevirmen"
              />
            )}
            {likedPublishers.length > 0 && (
              <EntityChipShelf
                title="Takip Edilen Yayınevleri"
                count={likedPublishers.length}
                items={likedPublishers}
                hrefPrefix="/yayinevi"
              />
            )}
          </div>
        )}

        {ownerBlogs.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Blog Yazıları</SectionLabel>
              <span className="text-sm text-muted-foreground">({ownerBlogs.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ownerBlogs.map((b) => {
                const t = TONE_STYLE[toneForId(b.id)];
                return (
                  <Link
                    key={b.id}
                    href={`/blog/${b.slug}`}
                    className="group flex overflow-hidden rounded-lg border border-border transition-colors hover:border-foreground/20 hover:bg-accent"
                  >
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: t.bg }} />
                    <div className="flex flex-1 flex-col justify-center gap-1 px-3 py-2.5">
                      <p className="text-sm font-medium leading-snug">{b.title}</p>
                      {!b.approved && (
                        <span className="w-fit rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium text-secondary-foreground">
                          Onay bekliyor
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function StatChip({
  href,
  value,
  label,
}: {
  href?: string;
  value: number | string;
  label: string;
}) {
  const content = (
    <div className="flex flex-col rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-accent">
      <span className="font-heading text-base font-medium leading-none">{value}</span>
      <span className="text-[0.7rem] text-muted-foreground">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function BookShelf({
  title,
  count,
  books,
}: {
  title: string;
  count: number;
  books: { id: number; name: string; slug: string; hasImage: boolean; writers: string[] }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <SectionLabel>{title}</SectionLabel>
        <span className="text-sm text-muted-foreground">({count})</span>
      </div>
      <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((b) => (
          <Link key={b.id} href={`/kitap/${b.slug}`} className="flex w-24 shrink-0 flex-col gap-1.5">
            <BookCover
              title={b.name}
              author={b.writers.join(", ") || "Yazar bilinmiyor"}
              tone={toneForId(b.id)}
              bookId={b.id}
              hasImage={b.hasImage}
              size="sm"
              className="w-full"
            />
            <p className="truncate text-xs font-medium">{b.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EntityChipShelf({
  title,
  count,
  items,
  hrefPrefix,
}: {
  title: string;
  count: number;
  items: { id: number; name: string; slug: string }[];
  hrefPrefix: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <SectionLabel>{title}</SectionLabel>
        <span className="text-sm text-muted-foreground">({count})</span>
      </div>
      <div className="-mx-6 flex gap-2.5 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${hrefPrefix}/${item.slug}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border py-1 pr-3.5 pl-1 text-sm transition-colors hover:border-foreground/20 hover:bg-accent"
          >
            <EntityAvatar id={item.id} name={item.name} size="size-7" />
            <span className="whitespace-nowrap">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
