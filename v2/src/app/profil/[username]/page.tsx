import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
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
} from "@/db/queries/profile";
import { getLikedWriters, getLikedTranslators } from "@/db/queries/likes";
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
  ] = await Promise.all([
    getFollowCounts(profile.id),
    viewerId && !isOwnProfile ? isFollowing(viewerId, profile.id) : Promise.resolve(false),
    getBooksByStatus(profile.id),
    getLibraryBooks(profile.id),
    getCurrentReadingGoal(profile.id),
    getPastReadingGoals(profile.id),
    getLikedWriters(profile.id),
    getLikedTranslators(profile.id),
  ]);

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-4 flex items-center gap-6">
        <Avatar className="size-20 text-xl">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            @{profile.username}
          </h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{counts.followers}</strong>{" "}
              takipçi
            </span>
            <span>
              <strong className="text-foreground">{counts.following}</strong>{" "}
              takip
            </span>
          </div>
        </div>
        {viewerId && !isOwnProfile && (
          <div className="ml-auto">
            <FollowButton targetUserId={profile.id} initialFollowing={viewerFollows} />
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
      </div>
    </div>
  );
}
