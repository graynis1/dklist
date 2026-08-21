import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getBlogBySlug } from "@/db/queries/blog";

export default function BlogDetailPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Suspense fallback={<BlogDetailSkeleton />}>
          <BlogDetailContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

function BlogDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded bg-muted" />
    </div>
  );
}

async function BlogDetailContent({
  params,
}: {
  params: PageProps<"/blog/[slug]">["params"];
}) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="flex flex-col gap-4">
      <SectionLabel>Blog</SectionLabel>
      <h1 className="font-heading text-4xl font-medium tracking-tight text-balance">
        {post.title}
      </h1>
      <p className="text-sm text-muted-foreground">
        {post.ownerUsername ? (
          <Link href={`/profil/${post.ownerUsername}`} className="hover:underline">
            @{post.ownerUsername}
          </Link>
        ) : null}
        {post.ownerUsername ? " · " : ""}
        {post.createdDate}
      </p>
      {post.content && (
        <div className="mt-4 leading-relaxed whitespace-pre-line text-foreground">
          {post.content}
        </div>
      )}
    </article>
  );
}
