import { getBlogBySlug, getBlogLikeState, incrementBlogViewCount } from "@/db/queries/blog";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return mobileJson({ status: "not_found", message: "Blog yazısı bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const like = await getBlogLikeState(session?.userId ?? null, blog.id);
  incrementBlogViewCount(blog.id).catch(() => {});

  const comments = await getEntityComments(blog.id, "blog");
  const repliesByComment = await getRepliesForComments(comments.map((c) => c.id));
  const commentsWithReplies = comments.map((c) => ({
    ...c,
    replies: repliesByComment.get(c.id) ?? [],
  }));

  return mobileJson({ status: "ok", blog, like, comments: commentsWithReplies });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
