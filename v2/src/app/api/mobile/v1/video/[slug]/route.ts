import { getVideoBySlug, incrementVideoViewCount } from "@/db/queries/videos";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) {
    return mobileJson({ status: "not_found", message: "Video bulunamadı." }, { status: 404 });
  }

  incrementVideoViewCount(video.id).catch(() => {});

  const comments = await getEntityComments(video.id, "video");
  const repliesByComment = await getRepliesForComments(comments.map((c) => c.id));
  const commentsWithReplies = comments.map((c) => ({ ...c, replies: repliesByComment.get(c.id) ?? [] }));

  return mobileJson({ status: "ok", video, comments: commentsWithReplies });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
