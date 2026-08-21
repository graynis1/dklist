import "server-only";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getUserWeeklyRank } from "@/db/queries/points";
import { getUnreadNotificationCount } from "@/db/queries/notifications";
import { getCurrentBookOfMonth } from "@/db/queries/book-of-month";
import { currentISOWeek } from "@/lib/iso-week";
import { sendMail, isMailConfigured } from "@/lib/mailer";

/**
 * Haftalık e-posta özeti - seventh item from the "what else could be
 * added" brainstorm list, now buildable since real email delivery exists
 * (src/lib/mailer.ts, built earlier this session). No cron infrastructure
 * exists in this Next.js app (no built-in scheduler) - real production
 * scheduling needs a VPS crontab hitting the protected
 * /api/cron/weekly-digest route with a shared secret (a deployment-time
 * detail, not something to fake up in dev). An admin manual "Şimdi Gönder"
 * trigger covers testing/on-demand sends in the meantime.
 *
 * Content is deliberately built only from data already cheaply and
 * reliably queryable (no new tracking added just for this digest): this
 * week's points/rank, unread notification count, and the current book of
 * the month as a re-engagement hook. A user with literally nothing to
 * report (no points this week, no unread notifications) doesn't get
 * emailed at all - a digest with nothing in it is just spam.
 */
export interface WeeklyDigestContent {
  weeklyPoints: number;
  weeklyRank: number | null;
  unreadNotifications: number;
  bookOfMonth: { name: string; slug: string } | null;
}

export async function buildWeeklyDigest(userId: number): Promise<WeeklyDigestContent | null> {
  const week = currentISOWeek();
  const [rank, unread, bom] = await Promise.all([
    getUserWeeklyRank(userId, week),
    getUnreadNotificationCount(userId),
    getCurrentBookOfMonth(),
  ]);

  const weeklyPoints = rank?.points ?? 0;
  if (weeklyPoints === 0 && unread === 0) return null;

  return {
    weeklyPoints,
    weeklyRank: rank?.rank ?? null,
    unreadNotifications: unread,
    bookOfMonth: bom ? { name: bom.bookName, slug: bom.bookSlug } : null,
  };
}

function renderDigestHtml(username: string, content: WeeklyDigestContent): string {
  const parts: string[] = [`<p>Merhaba ${username},</p>`, `<p>Bu haftaki DKList özetin:</p>`, `<ul>`];
  if (content.weeklyPoints > 0) {
    parts.push(`<li>Bu hafta <strong>${content.weeklyPoints} puan</strong> kazandın${content.weeklyRank ? ` (sıralamada #${content.weeklyRank})` : ""}.</li>`);
  }
  if (content.unreadNotifications > 0) {
    parts.push(`<li><strong>${content.unreadNotifications}</strong> okunmamış bildirimin var.</li>`);
  }
  if (content.bookOfMonth) {
    parts.push(`<li>Bu ayın kitabı: <strong>${content.bookOfMonth.name}</strong> - <a href="https://dklist.com/kitap/${content.bookOfMonth.slug}">gözat</a>.</li>`);
  }
  parts.push(`</ul>`, `<p><a href="https://dklist.com">dklist.com'u ziyaret et</a></p>`);
  return parts.join("\n");
}

/**
 * Sends every eligible user's digest right now (used by both the admin
 * manual trigger and the cron route) - not batched/paginated since this
 * is a v2 dev-scale user table, not the 98.5M-row book catalog; revisit
 * if the real user table ever grows large enough for this to matter.
 */
export async function sendWeeklyDigestsNow(): Promise<{ sent: number; skipped: number; mailConfigured: boolean }> {
  if (!isMailConfigured()) return { sent: 0, skipped: 0, mailConfigured: false };

  const users = await db.select({ id: user.id, username: user.username, mail: user.mail }).from(user);

  let sent = 0;
  let skipped = 0;
  for (const u of users) {
    const content = await buildWeeklyDigest(u.id);
    if (!content) {
      skipped += 1;
      continue;
    }
    await sendMail(u.mail, "DKList - Haftalık Özetin", renderDigestHtml(u.username, content));
    sent += 1;
  }

  return { sent, skipped, mailConfigured: true };
}
