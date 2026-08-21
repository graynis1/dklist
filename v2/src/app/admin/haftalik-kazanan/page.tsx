import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getWeeklyLeaderboard, getWeeklyWinner, getPastWeeklyWinners } from "@/db/queries/points";
import { currentISOWeek } from "@/lib/iso-week";
import { RecordWinnerForm } from "@/components/dklist/record-winner-form";
import { FulfillWinnerButton } from "@/components/dklist/fulfill-winner-button";

// Choosing/mailing the actual free book is a real admin action (recording a
// weekly winner, unlike simply viewing the leaderboard) - Admin-only, same
// bar as the other real-world-consequence admin tools this session built
// (newsletter delete, blog approval).
const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminWeeklyWinnerPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <AdminWeeklyWinnerContent />
      </Suspense>
    </div>
  );
}

async function AdminWeeklyWinnerContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const week = currentISOWeek();
  const [leaderboard, currentWinner, pastWinners] = await Promise.all([
    getWeeklyLeaderboard(20, week),
    getWeeklyWinner(week),
    getPastWeeklyWinners(10),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Haftalık Kazanan</h1>
        <p className="text-sm text-muted-foreground">
          Bu hafta ({week}) en yüksek puanı alan üyeyi seçip hediye edilecek kitabı kaydedin.
        </p>
      </div>

      {currentWinner ? (
        <div className="mb-8 rounded-lg border border-border bg-secondary p-4 text-sm">
          Bu haftanın kazananı zaten kaydedildi: <strong>@{currentWinner.username}</strong> (
          {currentWinner.points} puan){currentWinner.prizeBookName ? ` - 🎁 ${currentWinner.prizeBookName}` : ""}
          {!currentWinner.fulfilled && (
            <div className="mt-2">
              <FulfillWinnerButton id={currentWinner.id} />
            </div>
          )}
        </div>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu hafta henüz kimse puan kazanmadı.</p>
      ) : (
        <ol className="mb-8 flex flex-col gap-2">
          {leaderboard.map((entry, i) => (
            <li key={entry.userId} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
              <span>
                <strong>{i + 1}.</strong> @{entry.username} - {entry.points} puan
              </span>
              <RecordWinnerForm yearWeek={week} userId={entry.userId} points={entry.points} />
            </li>
          ))}
        </ol>
      )}

      {pastWinners.length > 0 && (
        <div>
          <SectionLabel>Geçmiş Haftalar</SectionLabel>
          <ul className="mt-4 flex flex-col gap-2">
            {pastWinners.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <Link href={`/profil/${w.username}`} className="font-medium hover:underline">
                    @{w.username}
                  </Link>
                  <span className="text-xs text-muted-foreground"> · {w.yearWeek} · {w.points} puan</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {w.prizeBookName ?? "Ödül yok"} {w.fulfilled ? "· Gönderildi" : ""}
                  {!w.fulfilled && <FulfillWinnerButton id={w.id} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
