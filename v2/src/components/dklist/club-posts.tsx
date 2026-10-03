"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlusIcon, XIcon, Trash2Icon, MessageSquareIcon } from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { ProfileLink } from "@/components/dklist/profile-link";
import { FeedPostLikeButton } from "@/components/dklist/feed-post-like-button";
import { FeedReplyThread } from "@/components/dklist/feed-reply-thread";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { ClubPost } from "@/db/queries/club-posts";

interface ActionResult {
  status: boolean;
  message?: string;
}

/**
 * In-club posts (customer: clubs should be "rooms" people stay in - posts
 * with images, likes and threaded replies, like the home feed). Likes and
 * replies reuse the feed's own components/actions since club posts are
 * feed_post rows scoped to the club.
 */
export function ClubPosts({
  clubId,
  slug,
  posts,
  viewerId,
  canPost,
  canManage,
  me,
  createAction,
  deleteAction,
}: {
  clubId: number;
  slug: string;
  posts: (Omit<ClubPost, "image"> & { image: string | null })[];
  viewerId: number | null;
  canPost: boolean;
  canManage: boolean;
  me: { id: number; username: string; image: string | null } | null;
  createAction: (clubId: number, slug: string, formData: FormData) => Promise<ActionResult>;
  deleteAction: (clubId: number, slug: string, postId: number) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  function clearImage() {
    setImageFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    if (!text.trim() && !imageFile) return;
    setError(null);
    const fd = new FormData();
    fd.append("text", text);
    if (imageFile) fd.append("image", imageFile);
    startTransition(async () => {
      const result = await createAction(clubId, slug, fd);
      if (result.status) {
        setText("");
        clearImage();
        router.refresh();
      } else {
        setError(result.message ?? "Paylaşılamadı.");
      }
    });
  }

  function remove(postId: number) {
    if (!window.confirm("Bu gönderi silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteAction(clubId, slug, postId);
      if (result.status) setHidden((prev) => new Set(prev).add(postId));
      else setError(result.message ?? "Silinemedi.");
    });
  }

  const visible = posts.filter((p) => !hidden.has(p.id));

  return (
    <div className="flex flex-col gap-4">
      {canPost && me ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <EntityAvatar id={me.id} name={me.username} image={me.image} size="size-10" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={text.length > 80 ? 4 : 2}
              maxLength={2000}
              placeholder="Kulüple bir şey paylaş…"
              className="min-h-[44px] flex-1 resize-none rounded-lg bg-muted/60 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted"
            />
          </div>
          {preview && (
            <div className="relative mt-3 ml-13 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-64 rounded-lg object-cover" />
              <button type="button" onClick={clearImage} aria-label="Görseli kaldır" className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75">
                <XIcon className="size-4" />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImageFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <ImagePlusIcon className="size-4" />
              Fotoğraf
            </button>
            <Button size="sm" onClick={submit} disabled={isPending || (!text.trim() && !imageFile)}>
              {isPending ? "Paylaşılıyor…" : "Paylaş"}
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {viewerId ? "Paylaşım yapmak ve sohbete katılmak için kulübe katıl." : "Paylaşımları görmek ve katılmak için giriş yap."}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <MessageSquareIcon className="size-7" />
          <p className="text-sm">Henüz paylaşım yok{canPost ? " - ilk paylaşımı sen yap." : "."}</p>
        </div>
      ) : (
        visible.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 px-4 pt-4">
              <EntityAvatar id={p.authorUserId} name={p.authorUsername} image={p.authorImage} size="size-10" profileFrame={p.profileFrame} frameTier={p.frameTier} />
              <div className="flex min-w-0 flex-1 flex-col">
                <ProfileLink username={p.authorUsername} className="truncate text-sm font-semibold hover:underline">
                  {p.authorUsername}
                </ProfileLink>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(p.createdAt)}</span>
              </div>
              {(p.authorUserId === viewerId || canManage) && (
                <button type="button" onClick={() => remove(p.id)} disabled={isPending} aria-label="Gönderiyi sil" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive">
                  <Trash2Icon className="size-4" />
                </button>
              )}
            </div>
            {p.text && <p className="px-4 pt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{p.text}</p>}
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" loading="lazy" className="mt-3 max-h-[560px] w-full object-cover" />
            )}
            <div className="flex items-center gap-2 px-4 pt-3">
              <FeedPostLikeButton postId={p.id} signedIn={Boolean(viewerId)} initialState={p.likeState} />
            </div>
            <div className="px-4 pt-2 pb-4">
              <FeedReplyThread parentType="feedPost" parentId={p.id} initialReplies={p.replies} signedIn={Boolean(viewerId) && canPost} />
            </div>
          </article>
        ))
      )}
    </div>
  );
}
