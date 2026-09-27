import { apiFetch } from "@/api/client";

type Decoration = { profileFrame: string | null; frameTier: 1 | 2 | 3 | 4 };

export interface AuthorMember extends Decoration {
  userId: number;
  username: string;
  image: string | null;
  writerName: string | null;
  writerSlug: string | null;
  postCount: number;
}

export interface AuthorPost {
  id: number;
  userId: number;
  username: string;
  image: string | null;
  title: string;
  content: string;
  createdDate: string;
  profileFrame?: string | null;
  frameTier?: 1 | 2 | 3 | 4;
}

export interface WriterApplication {
  id: number;
  status: "pending" | "approved" | "rejected";
  reviewerNote: string | null;
  submittedAt: string;
}

export interface YazarhaneHome {
  canPost: boolean;
  canApply: boolean;
  myApplication: WriterApplication | null;
  members: AuthorMember[];
  posts: AuthorPost[];
}

export async function getYazarhane(): Promise<YazarhaneHome> {
  return apiFetch<{ status: "ok" } & YazarhaneHome>("/yazarhane");
}

export interface AuthorHub extends Decoration {
  userId: number;
  username: string;
  image: string | null;
  biyo: string | null;
  writerId: number | null;
  writerName: string | null;
  writerSlug: string | null;
  writerBiyo: string | null;
  writerScore: number | null;
}

export async function getAuthorHub(username: string): Promise<{ hub: AuthorHub; isOwner: boolean; posts: AuthorPost[] }> {
  return apiFetch(`/yazarhane/${encodeURIComponent(username)}`);
}

export async function createAuthorPost(title: string, content: string): Promise<{ id: number }> {
  return apiFetch("/yazarhane/post", { method: "POST", body: JSON.stringify({ title, content }) });
}

export async function deleteAuthorPost(id: number): Promise<void> {
  await apiFetch(`/yazarhane/post/${id}`, { method: "DELETE" });
}

export async function applyForYazarhane(message: string, proposedWriterId: number | null): Promise<void> {
  await apiFetch("/yazarhane/apply", { method: "POST", body: JSON.stringify({ message, proposedWriterId }) });
}
