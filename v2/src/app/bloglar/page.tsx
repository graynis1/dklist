import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getBlogList } from "@/db/queries/blog";

export default function BlogListPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Bloglar</h1>
        </div>
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList />
        </Suspense>
      </div>
    </div>
  );
}

function BlogListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function BlogList() {
  const posts = await getBlogList();

  if (posts.length === 0) {
    return <p className="text-muted-foreground">Henüz blog yazısı yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {posts.map((post) => (
        <li key={post.id} className="border-b border-border pb-6">
          <Link href={`/blog/${post.slug}`} className="flex flex-col gap-1">
            <h2 className="font-heading text-xl font-medium tracking-tight hover:text-primary">
              {post.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {post.ownerUsername ? `@${post.ownerUsername} · ` : ""}
              {post.createdDate}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {post.preview}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
