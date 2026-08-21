import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getBlogBySlug } from "@/db/queries/blog";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditBlogForm } from "@/components/dklist/edit-blog-form";

const ELEVATED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function EditBlogPage({ params }: PageProps<"/blog/[slug]/duzenle">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <EditBlogContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditBlogContent({
  params,
}: {
  params: PageProps<"/blog/[slug]/duzenle">["params"];
}) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const viewerId = Number(session.user.id);
  const isOwner = post.ownerId === viewerId;
  const isElevated = hasRole(session.user.userType, ELEVATED_ROLES);
  if (!isOwner && !isElevated) redirect(`/blog/${slug}`);

  // Matches v1's get($slug): the post's own owner sees their pending
  // (unapproved) draft here, not the still-live older version - otherwise
  // every reopen of the edit form would lose the draft and restart from
  // the published text.
  const showPending = isOwner && post.hasPendingRevision;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Blog</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yazıyı Düzenle</h1>
        {showPending && (
          <p className="text-sm text-muted-foreground">
            Onay bekleyen bir taslağınız var - aşağıda o taslak gösteriliyor.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Yazı Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <EditBlogForm
            blogId={post.id}
            slug={post.slug}
            initialTitle={showPending ? (post.pendingTitle ?? post.title) : post.title}
            initialPreview={showPending ? (post.pendingPreview ?? post.preview) : post.preview}
            initialContent={showPending ? (post.pendingContent ?? post.content ?? "") : (post.content ?? "")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
