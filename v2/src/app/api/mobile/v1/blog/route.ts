import { getBlogList, createBlogPost } from "@/db/queries/blog";
import { hasRole, USER_TYPES } from "@/lib/roles";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { getMobileSession } from "@/lib/mobile-auth";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

// Same author roles as the web createBlogAction.
const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("q") ?? "";
  const session = await getMobileSession(request);
  const [result, userType] = await Promise.all([getBlogList(page, 10, search), session ? getLiveUserType(session.userId) : Promise.resolve(null)]);
  return mobileJson({ status: "ok", ...result, canWrite: hasRole(userType, BLOG_AUTHOR_ROLES) });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The mobile editor is plain text: blank-line-separated paragraphs become
 * <p> blocks and single newlines <br>, then the same sanitizer the web
 * composer's rich-text output goes through. New posts land unapproved,
 * exactly like the web flow. */
function paragraphsToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const userType = await getLiveUserType(session.userId);
  if (!hasRole(userType, BLOG_AUTHOR_ROLES)) {
    return mobileJson({ status: "invalid", message: "Blog yazma yetkin yok." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return mobileJson({ status: "invalid", message: "Geçersiz istek." }, { status: 400 });
  }
  const image = formData.get("image");
  const result = await createBlogPost(
    session.userId,
    session.username,
    String(formData.get("title") ?? ""),
    String(formData.get("preview") ?? ""),
    sanitizeBlogHtml(paragraphsToHtml(String(formData.get("content") ?? ""))),
    image instanceof File ? image : new File([], ""),
  );
  if (!result.status) {
    return mobileJson({ status: "invalid", message: result.message ?? "Blog kaydedilemedi." }, { status: 400 });
  }
  return mobileJson({ status: "ok", slug: result.slug });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
