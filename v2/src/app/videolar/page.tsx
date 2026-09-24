import { Suspense } from "react";
import Link from "next/link";
import { PlayIcon } from "lucide-react";
import { SiteHeader } from "@/components/dklist/site-header";
import { CommunitySidebarNav } from "@/components/dklist/community-sidebar-nav";
import { CommunityRightRail } from "@/components/dklist/community-right-rail";
import { ImageWithFallback } from "@/components/dklist/image-with-fallback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getVideoList, getFeaturedVideo } from "@/db/queries/videos";

/** Same "typeset placeholder if the real image ever 404s" shape as
 * BlogCover/PhotoBookCover - YouTube's own thumbnail CDN is reliable, but
 * a deleted/private video's thumbnail can genuinely disappear. */
function VideoThumbnail({ videoId, className, iconClassName }: { videoId: string | null; className?: string; iconClassName?: string }) {
  const placeholder = (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent">
      <PlayIcon className={`text-muted-foreground/40 ${iconClassName ?? "size-8"}`} />
    </div>
  );
  if (!videoId) return placeholder;
  return (
    <ImageWithFallback
      src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
      alt=""
      className={`size-full object-cover ${className ?? ""}`}
      fallback={placeholder}
    />
  );
}

export default function VideoListPage({ searchParams }: PageProps<"/videolar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[100rem] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_320px]">
          <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:h-fit">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <CommunitySidebarNav />
            </Suspense>
          </aside>

          <main className="min-w-0">
            <div className="mb-6 flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-medium tracking-tight">Videolar</h1>
              <p className="text-sm text-muted-foreground">DKList&apos;ten yazar sohbetleri ve kitap videoları.</p>
            </div>
            <Suspense fallback={<VideoListSkeleton />}>
              <VideoList searchParams={searchParams} />
            </Suspense>
          </main>

          <aside className="hidden min-w-0 xl:sticky xl:top-20 xl:block xl:h-fit">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <CommunityRightRail placement="videolar-sidebar" />
            </Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VideoListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

async function VideoList({
  searchParams,
}: {
  searchParams: PageProps<"/videolar">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  // Same "featured means most-viewed, not just newest" convention as
  // /bloglar's hero - only on the real front page, not search/page 2.
  const wantsHero = page === 1 && !search;
  const hero = wantsHero ? await getFeaturedVideo() : null;
  const { items, total, lastPage } = await getVideoList(page, 12, search);
  const rest = hero ? items.filter((v) => v.id !== hero.id) : items;

  return (
    <div>
      <form action="/videolar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Videolarda ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {rest.length === 0 && !hero ? (
        <p className="text-muted-foreground">
          {search ? "Bu aramaya uyan video yok." : "Henüz video yok."}
        </p>
      ) : (
        <>
          {hero && (
            <Link
              href={`/video/${hero.slug}`}
              className="group mb-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/15 md:grid-cols-[1.3fr_1fr]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted md:aspect-auto md:h-full">
                <VideoThumbnail videoId={hero.youtubeVideoId} className="transition-transform duration-300 group-hover:scale-105" iconClassName="size-14" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <PlayIcon className="size-14 fill-white/90 text-white/90 drop-shadow-lg" />
                </span>
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                  Öne Çıkan
                </span>
                <h2 className="font-heading text-2xl leading-tight font-medium tracking-tight group-hover:text-primary sm:text-3xl">
                  {hero.title}
                </h2>
                <span className="text-sm text-muted-foreground">{hero.createdDate}</span>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/15"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <VideoThumbnail videoId={video.youtubeVideoId} className="transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <PlayIcon className="size-10 fill-white/90 text-white/90 drop-shadow-lg" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="font-heading text-lg leading-tight font-medium tracking-tight group-hover:text-primary">
                    {video.title}
                  </h2>
                  <span className="mt-auto text-xs text-muted-foreground">{video.createdDate}</span>
                </div>
              </Link>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex justify-center gap-2 text-sm">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/videolar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      {total > 0 && <p className="mt-4 text-xs text-muted-foreground">Toplam {total} video.</p>}
    </div>
  );
}
