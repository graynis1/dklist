import { Suspense } from "react";
import Link from "next/link";
import { TrendingUpIcon, TrophyIcon } from "lucide-react";
import { auth } from "@/auth";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { FollowButton } from "@/components/dklist/follow-button";
import { AdSlot } from "@/components/dklist/ad-slot";
import { getTrendingBooks } from "@/db/queries/activity";
import { getFollowSuggestions } from "@/db/queries/profile";
import { getWeeklyLeaderboard } from "@/db/queries/points";
import { currentISOWeek } from "@/lib/iso-week";

const MEDALS = ["🥇", "🥈", "🥉"];

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

/**
 * Facebook/Reddit's right-rail "what else is happening" panel - trending
 * content, people you might know, a leaderboard snapshot, and a real ad
 * slot, all real data (nothing invented) reusing widgets already built
 * for the homepage. Part of the maintainer's ask to make /akis read as a
 * fully-fleshed-out platform, not a single centered column.
 */
export async function CommunityRightRail() {
  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;

  const [trending, suggestions, leaders] = await Promise.all([
    getTrendingBooks(5),
    viewerId ? getFollowSuggestions(viewerId, 4) : Promise.resolve([]),
    getWeeklyLeaderboard(3, currentISOWeek()),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {trending.length > 0 && (
        <RailCard title="Trend Kitaplar">
          <ul className="flex flex-col gap-3">
            {trending.map((b) => (
              <li key={b.id}>
                <Link href={`/kitap/${b.slug}`} className="flex items-center gap-2.5 rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-accent">
                  <BookCover
                    title={b.name}
                    author={b.writers.join(", ")}
                    tone={toneForId(b.id)}
                    bookId={b.id}
                    hasImage={b.hasImage}
                    size="sm"
                    className="w-9 shrink-0"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{b.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUpIcon className="size-3" />
                      {b.recentCommentCount} yorum bu hafta
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </RailCard>
      )}

      {suggestions.length > 0 && (
        <RailCard title="Tanıyor Olabilirsin">
          <ul className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5">
                <Link href={`/profil/${s.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <EntityAvatar id={s.id} name={s.username} image={s.image} size="size-8" className="shrink-0" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">@{s.username}</span>
                    <span className="text-xs text-muted-foreground">{s.sharedBookCount} ortak kitap</span>
                  </div>
                </Link>
                <FollowButton targetUserId={s.id} initialFollowing={false} className="h-7 shrink-0 px-2.5 text-xs" />
              </li>
            ))}
          </ul>
        </RailCard>
      )}

      {leaders.length > 0 && (
        <RailCard title="Bu Haftanın Liderleri">
          <ul className="flex flex-col gap-2.5">
            {leaders.map((l, i) => (
              <li key={l.userId}>
                <Link href={`/profil/${l.username}`} className="flex items-center gap-2.5 rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-accent">
                  <span className="text-base leading-none">{MEDALS[i]}</span>
                  <EntityAvatar id={l.userId} name={l.username} image={l.image} size="size-7" className="shrink-0" />
                  <span className="truncate text-sm font-medium">@{l.username}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{l.points} puan</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/puan-tablosu" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <TrophyIcon className="size-3.5" />
            Tüm Tabloyu Gör
          </Link>
        </RailCard>
      )}

      <Suspense fallback={null}>
        <AdSlot placement="akis-sidebar" className="max-w-none px-0" />
      </Suspense>
    </div>
  );
}
