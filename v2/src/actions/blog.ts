"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireRole, hasRole, USER_TYPES } from "@/lib/permission";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setBlogApproval,
  incrementBlogViewCount,
  setBlogReaction,
  setBlogCommentsDisabled,
} from "@/db/queries/blog";
import { addEntityComment, addSubComment, shareEntityComment, type SubCommentParentType, type CommentType } from "@/db/queries/comments";
import { logAdminAction } from "@/db/queries/admin-log";

// v1's own comment on this permission set: Mod/Admin couldn't originally
// post either, which is why the admin panel's Blog table had no way to add
// a post - matched here rather than "fixed", since it's the real behavior.
const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];
const BLOG_APPROVE_ROLES = [USER_TYPES.Admin];

export async function createBlogAction(formData: FormData) {
  // Both the public /blog/yeni composer and the admin panel's own
  // /admin/bloglar/yeni page post to this same action - a hidden "from"
  // field (defaults to the public route for back-compat) lets an error
  // send the author back to whichever composer they were actually using,
  // instead of always bouncing an admin out of the panel to the public page.
  const from = String(formData.get("from") ?? "/blog/yeni");

  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (!hasRole(session.user.userType, BLOG_AUTHOR_ROLES)) redirect("/bloglar");

  try {
    await requireRole(BLOG_AUTHOR_ROLES);
  } catch (err) {
    redirect(`${from}?error=${encodeURIComponent((err as Error).message)}`);
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
    redirect(`${from}?error=${encodeURIComponent(result.message ?? "Bir hata oluştu.")}`);
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

/** Fire-and-forget from the page - never throws, a failed increment
 * shouldn't break the actual page render. */
export async function trackBlogViewAction(blogId: number): Promise<void> {
  await incrementBlogViewCount(blogId).catch(() => {});
}

export async function setBlogReactionAction(blogId: number, value: 1 | -1): Promise<{ status: boolean; message?: string; reaction?: 1 | -1 | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const { reaction } = await setBlogReaction(Number(session.user.id), blogId, value);
    return { status: true, reaction };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setBlogCommentsDisabledAction(blogId: number, disabled: boolean): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await setBlogCommentsDisabled(Number(session.user.id), session.user.userType ?? "", blogId, disabled);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addBlogCommentAction(blogId: number, commentType: CommentType, text: string): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await addEntityComment(Number(session.user.id), blogId, "blog", text, commentType);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addBlogReplyAction(parentType: SubCommentParentType, parentId: number, text: string): Promise<{ status: boolean; message?: string; replyId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const replyId = await addSubComment(Number(session.user.id), parentType, parentId, text);
    return { status: true, replyId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function shareBlogCommentAction(originalCommentId: number, commentary: string): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "blog", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
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
