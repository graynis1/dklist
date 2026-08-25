import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { getBlockedUsers } from "@/db/queries/blocks";
import { UnblockButton } from "@/components/dklist/unblock-button";

export default function BlockedUsersPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Ayarlar</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Engellenen Kullanıcılar</h1>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <BlockedUsersContent />
        </Suspense>
      </div>
    </div>
  );
}

async function BlockedUsersContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const blocked = await getBlockedUsers(Number(session.user.id));

  if (blocked.length === 0) {
    return <p className="text-sm text-muted-foreground">Engellediğin kimse yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {blocked.map((b) => (
        <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Avatar className="size-10">
            <AvatarImage src={avatarUrl(b.image) ?? undefined} />
            <AvatarFallback>{b.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm font-medium">@{b.username}</span>
          <UnblockButton targetUserId={b.id} />
        </li>
      ))}
    </ul>
  );
}
