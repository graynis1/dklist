import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
import { auth } from "@/auth";
import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getBooksByStatus,
} from "@/db/queries/profile";
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

  const [counts, viewerFollows, booksByStatus] = await Promise.all([
    getFollowCounts(profile.id),
    viewerId && !isOwnProfile ? isFollowing(viewerId, profile.id) : Promise.resolve(false),
    getBooksByStatus(profile.id),
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
        <p className="mb-10 max-w-xl leading-relaxed text-muted-foreground">
          {profile.biyo}
        </p>
      )}

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
      </div>
    </div>
  );
}
