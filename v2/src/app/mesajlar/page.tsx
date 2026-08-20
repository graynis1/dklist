import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageThread } from "@/components/dklist/message-thread";
import { auth } from "@/auth";
import { getConversations, getMessages } from "@/db/queries/messages";
import { getProfileByUsername } from "@/db/queries/profile";
import { avatarUrl } from "@/db/queries/avatar";

export default function MessagesPage({ searchParams }: PageProps<"/mesajlar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Mesajlar</h1>
        </div>
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
  const conversations = await getConversations(currentUserId);

  const activeUsername =
    typeof selectedUsername === "string" ? selectedUsername : conversations[0]?.otherUsername;

  let initialMessages: Awaited<ReturnType<typeof getMessages>>["messages"] = [];
  let activeProfile: { id: number; username: string; image: string | null } | null = null;

  if (activeUsername) {
    const profile = await getProfileByUsername(activeUsername);
    if (profile) {
      activeProfile = profile;
      const page = await getMessages(currentUserId, profile.id);
      initialMessages = page.messages;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 rounded-lg border border-border md:grid-cols-[16rem_1fr]">
      <div className="flex flex-col divide-y divide-border border-b border-border md:border-r md:border-b-0">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Henüz bir konuşman yok.</p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.otherUserId}
              href={`/mesajlar?user=${c.otherUsername}`}
              className={`flex items-center gap-3 p-3 transition-colors hover:bg-accent ${
                c.otherUsername === activeUsername ? "bg-accent" : ""
              }`}
            >
              <Avatar className="size-9 text-sm">
                <AvatarFallback>{c.otherUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">@{c.otherUsername}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {c.lastMessagePreview ?? ""}
                </span>
              </div>
              {c.unreadCount > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </Link>
          ))
        )}
      </div>

      <div className="flex flex-col">
        {activeProfile ? (
          <>
            <div className="flex items-center gap-3 border-b border-border p-3">
              <Avatar className="size-8 text-sm">
                <AvatarImage src={avatarUrl(activeProfile.image) ?? undefined} />
                <AvatarFallback>{activeProfile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Link href={`/profil/${activeProfile.username}`} className="font-medium hover:underline">
                @{activeProfile.username}
              </Link>
            </div>
            <MessageThread
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
