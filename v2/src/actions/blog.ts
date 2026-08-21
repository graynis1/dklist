"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireRole, hasRole, USER_TYPES } from "@/lib/permission";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setBlogApproval,
} from "@/db/queries/blog";
import { logAdminAction } from "@/db/queries/admin-log";

// v1's own comment on this permission set: Mod/Admin couldn't originally
// post either, which is why the admin panel's Blog table had no way to add
// a post - matched here rather than "fixed", since it's the real behavior.
const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];
const BLOG_APPROVE_ROLES = [USER_TYPES.Admin];

export async function createBlogAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (!hasRole(session.user.userType, BLOG_AUTHOR_ROLES)) redirect("/bloglar");

  try {
    await requireRole(BLOG_AUTHOR_ROLES);
  } catch (err) {
    redirect(`/blog/yeni?error=${encodeURIComponent((err as Error).message)}`);
  }

  const title = String(formData.get("title") ?? "");
  const preview = String(formData.get("preview") ?? "");
  const content = String(formData.get("content") ?? "");
  const image = formData.get("image");

  const result = await createBlogPost(
    Number(session.user.id),
    session.user.name ?? "",
    title,
    preview,
    content,
    image instanceof File ? image : new File([], ""),
  );

  if (!result.status) {
    redirect(`/blog/yeni?error=${encodeURIComponent(result.message ?? "Bir hata oluştu.")}`);
  }
  redirect(`/blog/${result.slug}?created=1`);
}

export async function updateBlogAction(blogId: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const title = String(formData.get("title") ?? "");
  const preview = String(formData.get("preview") ?? "");
  const content = String(formData.get("content") ?? "");
  const image = formData.get("image");

  const result = await updateBlogPost(
    Number(session.user.id),
    session.user.userType ?? "",
    blogId,
    title,
    preview,
    content,
    image instanceof File && image.size > 0 ? image : null,
  );

  return result;
}

export async function deleteBlogAction(
  blogId: number,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  return deleteBlogPost(Number(session.user.id), session.user.userType ?? "", blogId);
}

export async function approveBlogAction(
  blogId: number,
  approve: boolean,
): Promise<{ status: boolean; message?: string }> {
  let actor;
  try {
    actor = await requireRole(BLOG_APPROVE_ROLES);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  const result = await setBlogApproval(blogId, approve);
  if (result.status) {
    await logAdminAction(actor.id, approve ? "blog:approve" : "blog:reject", "blog", blogId);
  }
  return result;
}
