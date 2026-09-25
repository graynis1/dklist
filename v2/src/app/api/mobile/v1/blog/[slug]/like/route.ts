import { getBlogBySlug, setBlogReaction } from "@/db/queries/blog";
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

  const body = await request.json().catch(() => null);
  const value = body?.value === -1 ? -1 : 1;

  const result = await setBlogReaction(session.userId, blog.id, value);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
