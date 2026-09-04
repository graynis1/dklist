import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Puan Tablosu",
  description: "Bu haftanın ve tüm zamanların en aktif DKList okurları.",
  path: "/puan-tablosu",
});
import { connection } from "next/server";
import Link from "next/link";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { PointsShareCard } from "@/components/dklist/points-share-card";
import { AdSlot } from "@/components/dklist/ad-slot";
import {
  getWeeklyLeaderboard,
  getPastWeeklyWinners,
  getUserWeeklyRank,
  getPointSettings,
  getUserTotalPoints,
  getUserActivityStreak,
} from "@/db/queries/points";
import { currentISOWeek } from "@/lib/iso-week";

export default function LeaderboardPage({ searchParams }: PageProps<"/puan-tablosu">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-4 flex flex-col gap-2">
          <SectionLabel>Etkileşim</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Puan Tablosu</h1>
          <p className="text-sm text-muted-foreground">
            Her hafta en yüksek puanı alan üyeye sistem tarafından bir kitap hediye edilir.
          </p>
        </div>

        {/* currentISOWeek() reads the real clock (new Date()), a genuinely
            per-request value - isolated in its own Suspense boundary like
            every other dynamic-data section in this app, rather than
            blocking the whole page from being part of the static shell. */}
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardContent searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <AdSlot placement="puan-tablosu" className="mt-10 max-w-none px-0" />
        </Suspense>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function LeaderboardContent({
  searchParams,
}: {
  searchParams: PageProps<"/puan-tablosu">["searchParams"];
}) {
  // currentISOWeek() reads the real clock (new Date()) - Cache Components
  // needs an explicit dynamic-data marker before that's allowed during
  // prerendering, per Next's own suggested fix for this exact error.
  await connection();
  const week = currentISOWeek();
  const { limit: limitParam } = await searchParams;
  const limit = limitParam === "10" ? 10 : 20;

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const [leaderboard, pastWinners, myRank, pointSettings, totalPoints, streakDays] = await Promise.all([
    getWeeklyLeaderboard(limit, week),
    getPastWeeklyWinners(10),
    userId ? getUserWeeklyRank(userId, week) : Promise.resolve(null),
    getPointSettings(),
    userId ? getUserTotalPoints(userId) : Promise.resolve(0),
    userId ? getUserActivityStreak(userId) : Promise.resolve(0),
  ]);

  const iAmInVisibleList = userId !== null && leaderboard.some((e) => e.userId === userId);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <span>Kitap okudum: +{pointSettings.bookRead}</span>
        <span>Yorum yaz: +{pointSettings.comment} (günde en fazla {pointSettings.dailyCommentCap})</span>
        <span>Puan ver: +{pointSettings.rating} (günde en fazla {pointSettings.dailyRatingCap})</span>
        <span>Beğen: +{pointSettings.like}</span>
        <span>Paylaşım: +{pointSettings.socialShare}</span>
        <span>Mesaj al: +{pointSettings.messageReceived}</span>
        <span>Günlük ziyaret: +{pointSettings.dailyVisit}</span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Bu haftanın ({week}) en aktif okurları:</p>
        <div className="flex gap-2 text-xs">
          <Link
            href="/puan-tablosu?limit=10"
            className={`rounded-full px-2.5 py-1 ${limit === 10 ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
          >
            Top 10
          </Link>
          <Link
            href="/puan-tablosu?limit=20"
            className={`rounded-full px-2.5 py-1 ${limit === 20 ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
          >
            Top 20
          </Link>
        </div>
      </div>

      {myRank && session?.user?.name && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-medium">#{myRank.rank}</span>
            <p className="flex-1 text-sm">
              Bu hafta <span className="font-medium">{myRank.points} puan</span> ile {myRank.totalRanked} kişi arasında {myRank.rank}. sıradasın.
            </p>
          </div>
          {/* Real customer report: sharing your standing here only ever
              produced a generic link-preview card (the site's own default
              OG image, "sitenin DK şekli") instead of anything reflecting
              your actual status - swapped the plain link-share for the
              real canvas-drawn status card (already built for the profile
              page) so what gets shared actually shows your points/rank/
              streak. */}
          <PointsShareCard
            username={session.user.name}
            stats={{ totalPoints, weeklyPoints: myRank.points, weeklyRank: myRank.rank, streakDays }}
          />
        </div>
      )}

      {leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Bu hafta henüz kimse puan kazanmadı - ilk sen ol.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {leaderboard.map((entry, i) => (
            <li
              key={entry.userId}
              className={`flex items-center gap-3 rounded-lg border p-3 ${entry.userId === userId ? "border-primary/50 bg-primary/5" : "border-border"}`}
            >
              <span className="w-6 text-center font-heading text-lg font-medium text-muted-foreground">
                {i + 1}
              </span>
              <Avatar className="size-9 text-sm">
                <AvatarImage src={avatarUrl(entry.image) ?? undefined} />
                <AvatarFallback>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Link href={`/profil/${entry.username}`} className="flex-1 truncate text-sm font-medium hover:underline">
                @{entry.username}
              </Link>
              <span className="text-sm font-medium">{entry.points} puan</span>
            </li>
          ))}
        </ol>
      )}

      {!iAmInVisibleList && myRank && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Listede görünmüyor musun? #{myRank.rank}. sıradasın, yukarıdaki kart senin.
        </p>
      )}

      {pastWinners.length > 0 && (
        <div className="mt-12">
          <SectionLabel>Geçmiş Kazananlar</SectionLabel>
          <ul className="mt-4 flex flex-col gap-2">
            {pastWinners.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-col">
                  <Link href={`/profil/${w.username}`} className="font-medium hover:underline">
                    @{w.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">{w.yearWeek} · {w.points} puan</span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {w.prizeBookName ? (
                    <span>🎁 {w.prizeBookName}</span>
                  ) : (
                    <span>Ödül henüz belirlenmedi</span>
                  )}
                  {w.fulfilled && <div className="text-green-600 dark:text-green-500">Gönderildi</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
