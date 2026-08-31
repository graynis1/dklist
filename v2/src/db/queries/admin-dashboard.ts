import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, blog, notice, adInquiry, supportTicket, identityVerification } from "@/db/schema";

export interface AdminDashboardCounts {
  pendingBookSubmissions: number;
  pendingBlogItems: number;
  unresolvedNotices: number;
  openAdInquiries: number;
  openSupportTickets: number;
  pendingVerificationRequests: number;
}

/**
 * Lightweight per-queue counts for the admin dashboard - lets an admin see
 * at a glance which queues actually need attention instead of opening each
 * of the 25 admin tools one by one to check. Plain COUNT(*) is fine here:
 * every one of these tables is small/moderation-scale (hundreds to low
 * thousands of rows), nothing like the ~98.5M-row book table's own COUNT(*)
 * hazard this project has been careful about elsewhere.
 */
export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const [
    [pendingBooks],
    [pendingBlog],
    [notices],
    [adInq],
    [tickets],
    [verifications],
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(book).where(eq(book.approve, 0)),
    db.select({ n: sql<number>`count(*)` }).from(blog).where(sql`${blog.approved} = 0 OR ${blog.hasPendingRevision} = 1`),
    db.select({ n: sql<number>`count(*)` }).from(notice).where(eq(notice.isResolved, 0)),
    db.select({ n: sql<number>`count(*)` }).from(adInquiry).where(eq(adInquiry.handled, 0)),
    db.select({ n: sql<number>`count(*)` }).from(supportTicket).where(eq(supportTicket.status, "open")),
    db.select({ n: sql<number>`count(*)` }).from(identityVerification).where(eq(identityVerification.status, "pending")),
  ]);

  return {
    pendingBookSubmissions: Number(pendingBooks?.n ?? 0),
    pendingBlogItems: Number(pendingBlog?.n ?? 0),
    unresolvedNotices: Number(notices?.n ?? 0),
    openAdInquiries: Number(adInq?.n ?? 0),
    openSupportTickets: Number(tickets?.n ?? 0),
    pendingVerificationRequests: Number(verifications?.n ?? 0),
  };
}
