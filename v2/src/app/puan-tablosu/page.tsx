import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { getWeeklyLeaderboard, getPastWeeklyWinners, POINT_VALUES } from "@/db/queries/points";
import { currentISOWeek } from "@/lib/iso-week";

export default function LeaderboardPage() {
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

        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <span>Kitap okudum: +{POINT_VALUES.bookRead}</span>
          <span>Yorum yaz: +{POINT_VALUES.comment}</span>
          <span>Puan ver: +{POINT_VALUES.rating}</span>
          <span>Beğen: +{POINT_VALUES.like}</span>
        </div>

        {/* currentISOWeek() reads the real clock (new Date()), a genuinely
            per-request value - isolated in its own Suspense boundary like
            every other dynamic-data section in this app, rather than
            blocking the whole page from being part of the static shell. */}
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardContent />
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

async function LeaderboardContent() {
  // currentISOWeek() reads the real clock (new Date()) - Cache Components
  // needs an explicit dynamic-data marker before that's allowed during
  // prerendering, per Next's own suggested fix for this exact error.
  await connection();
  const week = currentISOWeek();
  const [leaderboard, pastWinners] = await Promise.all([
    getWeeklyLeaderboard(20, week),
    getPastWeeklyWinners(10),
  ]);

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Bu haftanın ({week}) en aktif okurları:</p>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Bu hafta henüz kimse puan kazanmadı - ilk sen ol.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {leaderboard.map((entry, i) => (
            <li
              key={entry.userId}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
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
