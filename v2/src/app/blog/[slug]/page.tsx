import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getBlogBySlug } from "@/db/queries/blog";
import { DeleteBlogButton } from "@/components/dklist/delete-blog-button";
import { ShareButton } from "@/components/dklist/share-button";
import { HashtagText } from "@/components/dklist/hashtag-text";

const ELEVATED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

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

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwner = viewerId !== null && post.ownerId === viewerId;
  const isElevated = hasRole(session?.user?.userType, ELEVATED_ROLES);
  const canManage = isOwner || isElevated;

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
        <span className="ml-2 inline-block align-middle">
          <ShareButton content={post.title} pointsKey={`blog:${post.id}`} />
        </span>
      </p>

      {isOwner && !post.approved && (
        <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Bu yazı henüz onaylanmadı, sadece siz ve moderatörler görebiliyor.
        </p>
      )}
      {isOwner && post.hasPendingRevision && (
        <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Onay bekleyen bir değişikliğiniz var - onaylanana kadar aşağıdaki (yayındaki) sürüm görünmeye devam edecek.
        </p>
      )}

      {post.img && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <Image src={post.img} alt={post.title} fill className="object-cover" unoptimized />
        </div>
      )}

      {post.content && (
        <div className="mt-4 leading-relaxed whitespace-pre-line text-foreground">
          <HashtagText text={post.content} />
        </div>
      )}

      {canManage && (
        <div className="mt-6 flex gap-3 border-t border-border pt-4 text-sm">
          <Link href={`/blog/${slug}/duzenle`} className="underline hover:text-foreground">
            Düzenle
          </Link>
          <DeleteBlogButton blogId={post.id} />
        </div>
      )}
    </article>
  );
}
