import { getBlogBySlug } from "@/db/queries/blog";
import { addEntityComment } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return mobileJson({ status: "not_found", message: "Blog yazısı bulunamadı." }, { status: 404 });
  }
  if (blog.commentsDisabled) {
    return mobileJson({ status: "error", message: "Bu yazıda yorumlar kapalı." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  try {
    const id = await addEntityComment(session.userId, blog.id, "blog", text);
    return mobileJson({ status: "ok", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yorum eklenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
