import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { NotificationsList } from "@/components/dklist/notifications-list";
import { auth } from "@/auth";
import { getNotifications } from "@/db/queries/notifications";
import { AdSlot } from "@/components/dklist/ad-slot";

export default function NotificationsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            Bildirimler
          </h1>
        </div>
        <Suspense fallback={null}>
          <AdSlot placement="bildirimler" className="mb-6 max-w-none px-0" />
        </Suspense>
        <Suspense fallback={<NotificationsSkeleton />}>
          <NotificationsContent />
        </Suspense>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function NotificationsContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const notifications = await getNotifications(Number(session.user.id));

  return <NotificationsList initialItems={notifications} />;
}
