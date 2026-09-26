import { apiFetch } from "@/api/client";
import type { EntityComment } from "@/components/EntityCommentSection";

export interface BlogListItem {
  id: number;
  title: string;
  preview: string;
  slug: string;
  createdDate: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  img: string | null;
}

export interface BlogDetail {
  id: number;
  title: string;
  content: string | null;
  preview: string;
  slug: string;
  createdDate: string;
  img: string | null;
  ownerUsername: string | null;
  ownerImage: string | null;
  viewCount: number;
  commentsDisabled: boolean;
}

export interface BlogLikeState {
  count: number;
  liked: boolean;
  dislikeCount: number;
  disliked: boolean;
}

export async function getBlogList(page = 1, q = "") {
  return apiFetch<{ status: "ok"; items: BlogListItem[]; total: number; page: number; lastPage: number }>(
    `/blog?page=${page}&q=${encodeURIComponent(q)}`,
  );
}

export async function getBlog(slug: string) {
  return apiFetch<{ status: "ok"; blog: BlogDetail; like: BlogLikeState; comments: EntityComment[] }>(
    `/blog/${encodeURIComponent(slug)}`,
  );
}

export async function toggleBlogLike(slug: string, value: 1 | -1 = 1) {
  return apiFetch<{ status: "ok"; reaction: 1 | -1 | null }>(`/blog/${encodeURIComponent(slug)}/like`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function addBlogComment(slug: string, text: string) {
  return apiFetch<{ status: "ok"; id: number }>(`/blog/${encodeURIComponent(slug)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export interface VideoListItem {
  id: number;
  title: string;
  slug: string;
  youtubeVideoId: string | null;
  createdDate: string;
  viewCount: number;
}

export interface VideoDetail extends VideoListItem {
  embededCode: string | null;
}

export async function getVideoList(page = 1, q = "") {
  return apiFetch<{ status: "ok"; items: VideoListItem[]; total: number; page: number; lastPage: number }>(
    `/video?page=${page}&q=${encodeURIComponent(q)}`,
  );
}

export async function getVideo(slug: string) {
  return apiFetch<{ status: "ok"; video: VideoDetail; comments: EntityComment[] }>(`/video/${encodeURIComponent(slug)}`);
}

export async function addVideoComment(slug: string, text: string) {
  return apiFetch<{ status: "ok"; id: number }>(`/video/${encodeURIComponent(slug)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
