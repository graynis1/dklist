import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { getAuthorMembers, getRecentAuthorPosts } from "@/db/queries/yazarhane";

export default function YazarhanePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Yazarhane</h1>
          <p className="text-sm text-muted-foreground">
            DKList&apos;te üye olan gerçek yazarların paylaşımları ve profilleri.
          </p>
        </div>
        <Suspense fallback={<YazarhaneSkeleton />}>
          <YazarhaneContent />
        </Suspense>
      </div>
    </div>
  );
}

function YazarhaneSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function YazarhaneContent() {
  await connection();
  const [members, posts] = await Promise.all([getAuthorMembers(), getRecentAuthorPosts(20)]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 font-heading text-xl font-medium">Yazarlar</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz Yazarhane&apos;de üye bir yazar yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <Link
                key={m.userId}
                href={`/yazarhane/${m.username}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <Avatar className="size-10">
                  <AvatarImage src={avatarUrl(m.image) ?? undefined} />
                  <AvatarFallback>{m.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">@{m.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.writerName ? `${m.writerName} · ` : ""}
                    {m.postCount} paylaşım
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-medium">Son Paylaşımlar</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz paylaşım yok.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Link href={`/yazarhane/${p.username}`} className="text-sm font-medium hover:underline">
                    @{p.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">{p.createdDate}</span>
                </div>
                <p className="mb-1 font-medium">{p.title}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
