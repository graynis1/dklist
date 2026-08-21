import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
import { ReportUserButton } from "@/components/dklist/report-user-button";
import { ReadingGoalControl } from "@/components/dklist/reading-goal-control";
import { auth } from "@/auth";
import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getBooksByStatus,
  getLibraryBooks,
  getCurrentReadingGoal,
  getPastReadingGoals,
  getUserBadges,
} from "@/db/queries/profile";
import { getLikedWriters, getLikedTranslators } from "@/db/queries/likes";
import { getUserTotalPoints, isRecentlyActive } from "@/db/queries/points";
import { getBlogsByOwner } from "@/db/queries/blog";
import { READ_STATUSES } from "@/lib/reading-status";

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
  ]);

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-4 flex items-center gap-6">
        <Avatar className="size-20 text-xl">
          <AvatarImage src={avatarUrl(profile.image) ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            @{profile.username}
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
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  🏅 {b.name}
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
          </div>
        )}
      </div>

      {profile.biyo && (
        <p className="mb-6 max-w-xl leading-relaxed text-muted-foreground">
          {profile.biyo}
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
    </div>
  );
}
