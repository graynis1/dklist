import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { MessageThread } from "@/components/dklist/message-thread";
import { ConversationsPanel } from "@/components/dklist/conversations-panel";
import { MessageRequestItem } from "@/components/dklist/message-request-item";
import { AdSlot } from "@/components/dklist/ad-slot";
import { auth } from "@/auth";
import { getConversations, getMessages, getMessageRequests } from "@/db/queries/messages";
import { getProfileByUsername } from "@/db/queries/profile";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";

export default function MessagesPage({ searchParams }: PageProps<"/mesajlar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Mesajlar</h1>
        </div>
        {/* Real customer report (2026-09-05): the ad used to sit below the
            fixed-height md:h-[40rem] conversation grid, genuinely below the
            fold on a normal viewport - moved above the content, matching
            /bildirimler's own placement (top, not bottom). Own Suspense
            boundary is required here - AdSlot reads auth() internally, and
            a real production incident this same day was caused by exactly
            this being skipped elsewhere (see PLAN.md). */}
        <Suspense fallback={null}>
          <AdSlot placement="mesajlar" className="mb-6 max-w-none px-0" />
        </Suspense>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <MessagesContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function MessagesContent({
  searchParams,
}: {
  searchParams: PageProps<"/mesajlar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }
  const currentUserId = Number(session.user.id);

  const { user: selectedUsername } = await searchParams;
  const [conversations, messageRequests] = await Promise.all([
    getConversations(currentUserId),
    getMessageRequests(currentUserId),
  ]);

  const activeUsername =
    typeof selectedUsername === "string" ? selectedUsername : conversations[0]?.otherUsername;

  let initialMessages: Awaited<ReturnType<typeof getMessages>>["messages"] = [];
  let activeProfile: { id: number; username: string; image: string | null; profileFrame: string | null } | null = null;

  if (activeUsername) {
    const profile = await getProfileByUsername(activeUsername);
    if (profile) {
      activeProfile = profile;
      const page = await getMessages(currentUserId, profile.id);
      initialMessages = page.messages;
    }
  }

  const decorations = await getUserDecorations([
    ...conversations.map((c) => c.otherUserId),
    ...messageRequests.map((r) => r.otherUserId),
    ...(activeProfile ? [activeProfile.id] : []),
  ]);

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border md:h-[40rem] md:grid-cols-[17rem_1fr]">
      <div className="flex flex-col divide-y divide-border overflow-y-auto border-b border-border md:border-r md:border-b-0">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Henüz bir konuşman yok.</p>
        ) : (
          <ConversationsPanel
            conversations={conversations}
            activeUsername={activeUsername}
            decorationFor={(userId) => decorationFor(decorations, userId)}
          />
        )}
        {messageRequests.length > 0 && (
          <div className="flex flex-col">
            <p className="p-3 pb-1 text-xs font-medium text-muted-foreground">
              Diğer Mesajlar ({messageRequests.length})
            </p>
            {messageRequests.map((r) => (
              <MessageRequestItem key={r.otherUserId} request={r} decoration={decorationFor(decorations, r.otherUserId)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex h-full min-h-0 flex-col">
        {activeProfile ? (
          <>
            <div className="flex items-center gap-3 border-b border-border p-3">
              <EntityAvatar
                id={activeProfile.id}
                name={activeProfile.username}
                image={activeProfile.image}
                size="size-8"
                profileFrame={decorationFor(decorations, activeProfile.id).profileFrame}
                frameTier={decorationFor(decorations, activeProfile.id).frameTier}
                highestBadge={decorationFor(decorations, activeProfile.id).highestBadge}
              />
              <Link href={`/profil/${activeProfile.username}`} className="font-medium hover:underline">
                @{activeProfile.username}
              </Link>
            </div>
            <MessageThread
              key={activeProfile.username}
              currentUserId={currentUserId}
              otherUsername={activeProfile.username}
              initialMessages={initialMessages}
            />
          </>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            Bir konuşma seç, veya bir profile giderek mesaj yaz.
          </p>
        )}
      </div>
    </div>
  );
}
