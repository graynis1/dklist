import { getBlogBySlug, getBlogLikeState, incrementBlogViewCount } from "@/db/queries/blog";
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

  return mobileJson({ status: "ok", blog, like });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
