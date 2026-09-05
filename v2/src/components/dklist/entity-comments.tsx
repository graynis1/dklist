"use client";

import { useRef, useState, useTransition } from "react";
import { StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookComment, CommentReply, SubCommentParentType } from "@/db/queries/comments";
import type { CommentLikeState } from "@/db/queries/comment-likes";
import { reportCommentAction } from "@/actions/notices";
import { updateCommentAction, deleteCommentAction, updateSubCommentAction, deleteSubCommentAction } from "@/actions/comment-edit";
import { ShareButton } from "@/components/dklist/share-button";
import { HashtagText } from "@/components/dklist/hashtag-text";
import { QuoteCard } from "@/components/dklist/quote-card";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { CommentLikeButton } from "@/components/dklist/comment-like-button";
import type { UserDecoration } from "@/db/queries/user-decorations";

/** v1's CommentComponent `notice()` - a silent fire-and-forget report that
 * just hides itself after sending, no confirmation modal (comment reports
 * carry no reason, unlike the profile report-user flow). */
function ReportCommentButton({ commentId, parentType }: { commentId: number; parentType: "comment" | "subComment" }) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return <span className="text-xs text-muted-foreground">Bildirildi</span>;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await reportCommentAction(commentId, parentType);
          setSent(true);
        })
      }
      className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
    >
      Şikayet Et
    </button>
  );
}

function ReplyForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        if (text.trim().length < 2) return;
        startTransition(() => onSubmit(text));
        setText("");
      }}
      className="mt-2 flex flex-col gap-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Yanıt yaz..."
        required
        minLength={2}
        maxLength={2000}
        rows={2}
        className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Yanıtla
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

/** Facebook-style "share with a caption" - commentary is optional (a bare
 * reshare with no added text is a valid, common case), so unlike ReplyForm
 * there's no minLength on the textarea. */
function ShareCommentForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (commentary: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => startTransition(() => onSubmit(text))}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <p className="text-xs text-muted-foreground">Kendi profilinize bir not ekleyerek paylaşın (opsiyonel).</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Bir şey ekleyin..."
        maxLength={2000}
        rows={2}
        className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Paylaş
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

/** Inline edit textarea shared by both comments and replies - swaps in
 * for the plain text display when the author chooses to edit. */
function EditForm({
  initialText,
  onCancel,
  onSubmit,
}: {
  initialText: string;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        if (text.trim().length < 2) return;
        startTransition(() => onSubmit(text));
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        minLength={2}
        maxLength={2000}
        rows={2}
        className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Kaydet
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

function ReplyItem({
  reply,
  canReply,
  viewerId,
  onReply,
  onEdit,
  onDelete,
}: {
  reply: CommentReply;
  canReply: boolean;
  viewerId?: number;
  onReply: (parentType: SubCommentParentType, parentId: number, text: string) => void;
  onEdit: (replyId: number, text: string) => void;
  onDelete: (replyId: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const isOwn = viewerId !== undefined && reply.authorUserId === viewerId;

  return (
    <li className="flex gap-2.5 border-l-2 border-border pl-3">
      <EntityAvatar
        id={reply.authorUserId}
        name={reply.authorUsername}
        image={reply.authorImage}
        size="size-7"
        className="mt-0.5 shrink-0"
        profileFrame={reply.profileFrame}
        frameTier={reply.frameTier}
        highestBadge={reply.highestBadge}
      />
      <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">@{reply.authorUsername}</span>
      </div>
      {editing ? (
        <EditForm
          initialText={reply.text}
          onCancel={() => setEditing(false)}
          onSubmit={(text) => {
            onEdit(reply.id, text);
            setEditing(false);
          }}
        />
      ) : (
        <p className="text-sm leading-relaxed"><HashtagText text={reply.text} /></p>
      )}
      <div className="flex items-center gap-3">
        {canReply && !editing && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Yanıtla
          </button>
        )}
        {isOwn && !editing ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bu yanıtı silmek istediğinizden emin misiniz?")) onDelete(reply.id);
              }}
              className="w-fit text-xs text-muted-foreground hover:text-destructive hover:underline"
            >
              Sil
            </button>
          </>
        ) : (
          !editing && <ReportCommentButton commentId={reply.id} parentType="subComment" />
        )}
      </div>
      {showForm && (
        <ReplyForm
          onCancel={() => setShowForm(false)}
          onSubmit={(text) => {
            onReply("subComment", reply.id, text);
            setShowForm(false);
          }}
        />
      )}
      {reply.replies.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {reply.replies.map((nested) => (
            <ReplyItem key={nested.id} reply={nested} canReply={false} viewerId={viewerId} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}
      </div>
    </li>
  );
}

/**
 * Generic across book/writer/translator pages - v1's WriterController::
 * getWriter() nests comments/subComments exactly like BookController::
 * getBook() does, just against a different Comment `type`. Parameterized
 * over pre-bound server actions (addCommentAction.bind(null, entityId)) the
 * same way EntityLikeButton/RateEntityControl are, rather than duplicated
 * per entity type.
 */
const NO_DECORATION: UserDecoration = { profileFrame: null, frameTier: 1, highestBadge: null };

export function EntityComments({
  signedIn,
  viewerId,
  viewerDecoration = NO_DECORATION,
  initialComments,
  initialRepliesByComment,
  commentLikes,
  addCommentAction,
  addReplyAction,
  shareCommentAction,
  placeholder = "Ne düşünüyorsunuz?",
  submitLabel = "Yorum Yap",
  emptyMessage = "Henüz yorum yok.",
  quoteCardSource,
}: {
  signedIn: boolean;
  /** The signed-in viewer's own user id, used only to decide whether to
   * show "Düzenle"/"Sil" on a given comment/reply - undefined when
   * signed out (no edit/delete controls render at all). */
  viewerId?: number;
  /** The signed-in viewer's own frame/badge, used only to decorate the
   * optimistic entry shown immediately after they post - the real value
   * from the next full data fetch always wins once one happens. */
  viewerDecoration?: UserDecoration;
  initialComments: BookComment[];
  initialRepliesByComment: Record<number, CommentReply[]>;
  commentLikes: Record<number, CommentLikeState>;
  addCommentAction: (text: string) => Promise<{ status: boolean; message?: string; commentId?: number }>;
  addReplyAction: (
    parentType: SubCommentParentType,
    parentId: number,
    text: string,
  ) => Promise<{ status: boolean; message?: string; replyId?: number }>;
  shareCommentAction: (
    originalCommentId: number,
    commentary: string,
  ) => Promise<{ status: boolean; message?: string; commentId?: number }>;
  placeholder?: string;
  submitLabel?: string;
  emptyMessage?: string;
  /** Renders a per-entry "Görsel Kart Oluştur" (quote-image) button when
   * set - only meaningful for a quotes ("alıntı") section, so callers pass
   * this (the book/writer/translator's own display name) only on that
   * instance, not the plain-comments one. */
  quoteCardSource?: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [repliesByComment, setRepliesByComment] = useState(initialRepliesByComment);
  const [error, setError] = useState<string | null>(null);
  const [replyFormFor, setReplyFormFor] = useState<number | null>(null);
  const [shareFormFor, setShareFormFor] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submitEditComment(commentId: number, text: string) {
    startTransition(async () => {
      const result = await updateCommentAction(commentId, text);
      if (result.status) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, text } : c)));
        setEditingCommentId(null);
      } else {
        setError(result.message ?? "Düzenlenemedi.");
      }
    });
  }

  function submitDeleteComment(commentId: number) {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId);
      if (result.status) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setRepliesByComment((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      } else {
        setError(result.message ?? "Silinemedi.");
      }
    });
  }

  function editReplyInTree(replies: CommentReply[], replyId: number, text: string): CommentReply[] {
    return replies.map((r) =>
      r.id === replyId ? { ...r, text } : { ...r, replies: editReplyInTree(r.replies, replyId, text) },
    );
  }

  function deleteReplyFromTree(replies: CommentReply[], replyId: number): CommentReply[] {
    return replies
      .filter((r) => r.id !== replyId)
      .map((r) => ({ ...r, replies: deleteReplyFromTree(r.replies, replyId) }));
  }

  function submitEditReply(commentId: number, replyId: number, text: string) {
    startTransition(async () => {
      const result = await updateSubCommentAction(replyId, text);
      if (result.status) {
        setRepliesByComment((prev) => ({
          ...prev,
          [commentId]: editReplyInTree(prev[commentId] ?? [], replyId, text),
        }));
      } else {
        setError(result.message ?? "Düzenlenemedi.");
      }
    });
  }

  function submitDeleteReply(commentId: number, replyId: number) {
    startTransition(async () => {
      const result = await deleteSubCommentAction(replyId);
      if (result.status) {
        setRepliesByComment((prev) => ({
          ...prev,
          [commentId]: deleteReplyFromTree(prev[commentId] ?? [], replyId),
        }));
      } else {
        setError(result.message ?? "Silinemedi.");
      }
    });
  }

  function submitShare(original: BookComment, commentary: string) {
    startTransition(async () => {
      const result = await shareCommentAction(original.id, commentary);
      if (result.status) {
        setComments((prev) => [
          {
            id: result.commentId!,
            text: commentary,
            date: new Date().toISOString().slice(0, 10),
            authorUsername: "siz",
            authorUserId: viewerId ?? -1,
            authorImage: null,
            sharedFrom: { authorUsername: original.authorUsername, text: original.text },
            authorScore: null,
            ...viewerDecoration,
          },
          ...prev,
        ]);
        setShareFormFor(null);
      }
    });
  }

  function submit(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(text);
      if (result.status) {
        formRef.current?.reset();
        // Use the server-assigned id immediately (not a placeholder) - a
        // reply posted against a still-fake id would insert with a parent_id
        // that never matches any real comment, a bug caught via real testing.
        setComments((prev) => [
          {
            id: result.commentId!,
            text,
            date: new Date().toISOString().slice(0, 10),
            authorUsername: "siz",
            authorUserId: viewerId ?? -1,
            authorImage: null,
            sharedFrom: null,
            authorScore: null,
            ...viewerDecoration,
          },
          ...prev,
        ]);
      } else {
        setError(result.message ?? "Bir hata oluştu.");
      }
    });
  }

  function submitReply(commentId: number, parentType: SubCommentParentType, parentId: number, text: string) {
    startTransition(async () => {
      const result = await addReplyAction(parentType, parentId, text);
      if (result.status) {
        const node: CommentReply = {
          id: result.replyId!,
          text,
          authorUsername: "siz",
          authorUserId: viewerId ?? -1,
          authorImage: null,
          parentType,
          parentId,
          replies: [],
          ...viewerDecoration,
        };
        setRepliesByComment((prev) => {
          const next = { ...prev };
          if (parentType === "comment") {
            next[commentId] = [...(next[commentId] ?? []), node];
          } else {
            // nested reply to a level-1 reply - splice it into that reply's own list
            next[commentId] = (next[commentId] ?? []).map((r) =>
              r.id === parentId ? { ...r, replies: [...r.replies, node] } : r,
            );
          }
          return next;
        });
        setReplyFormFor(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {signedIn ? (
        <form
          ref={formRef}
          action={submit}
          className="flex flex-col gap-2"
        >
          <textarea
            name="text"
            placeholder={placeholder}
            required
            minLength={2}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-fit">
            {submitLabel}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Yorum yapmak için{" "}
          <a href="/giris" className="underline hover:text-foreground">
            giriş yapın
          </a>
          .
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => {
            const replies = repliesByComment[c.id] ?? [];
            const isOwn = viewerId !== undefined && c.authorUserId === viewerId;
            const isEditing = editingCommentId === c.id;
            return (
              <li key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <EntityAvatar
                id={c.authorUserId}
                name={c.authorUsername}
                image={c.authorImage}
                size="size-9"
                className="mt-0.5 shrink-0"
                profileFrame={c.profileFrame}
                frameTier={c.frameTier}
                highestBadge={c.highestBadge}
              />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">@{c.authorUsername}</span>
                  {/* Real customer ask: "yorum yapan kişi puan verdi ise o
                      puan isminin altında yıldız işareti ile yazsa" -
                      Goodreads-style, next to the name rather than only
                      visible after opening their profile. */}
                  {c.authorScore != null && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <StarIcon className="size-3 fill-current" />
                      {c.authorScore}/10
                    </span>
                  )}
                  <span className="text-muted-foreground">{c.date}</span>
                </div>
                {c.sharedFrom && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">@{c.sharedFrom.authorUsername} yazmıştı:</p>
                    <p className="mt-1 leading-relaxed italic">
                      <HashtagText text={c.sharedFrom.text} />
                    </p>
                  </div>
                )}
                {isEditing ? (
                  <EditForm
                    initialText={c.text}
                    onCancel={() => setEditingCommentId(null)}
                    onSubmit={(text) => submitEditComment(c.id, text)}
                  />
                ) : (
                  c.text && <p className="text-sm leading-relaxed"><HashtagText text={c.text} /></p>
                )}
                {!isEditing && (
                  <div className="flex items-center gap-3">
                    <CommentLikeButton
                      commentId={c.id}
                      signedIn={signedIn}
                      initialState={commentLikes[c.id] ?? { count: 0, liked: false, dislikeCount: 0, disliked: false }}
                    />
                    {signedIn && (
                      <button
                        type="button"
                        onClick={() => setReplyFormFor((cur) => (cur === c.id ? null : c.id))}
                        className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Yanıtla
                      </button>
                    )}
                    {signedIn && !c.sharedFrom && (
                      // Real customer report: "böyle bir şey var ama
                      // işlevsel değil sanırım, çalışmıyor" - the feature
                      // itself works end to end (verified live: submitting
                      // creates a real new comment row with
                      // sharedFromCommentId set), the actual problem is
                      // this sat right next to the unrelated external
                      // ShareButton a few pixels away, both bare-labeled
                      // "Paylaş" - genuinely easy to click the wrong one
                      // and never notice this form opened below. Relabeled
                      // to say what it actually does.
                      <button
                        type="button"
                        onClick={() => setShareFormFor((cur) => (cur === c.id ? null : c.id))}
                        className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Akışında Paylaş
                      </button>
                    )}
                    {isOwn ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(c.id)}
                          className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Bu yorumu silmek istediğinizden emin misiniz?")) submitDeleteComment(c.id);
                          }}
                          className="w-fit text-xs text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Sil
                        </button>
                      </>
                    ) : (
                      <ReportCommentButton commentId={c.id} parentType="comment" />
                    )}
                    <ShareButton content={c.text} quote={c.text} />
                  </div>
                )}
                {quoteCardSource && !isEditing && <QuoteCard quoteText={c.text} sourceName={quoteCardSource} />}
                {replyFormFor === c.id && (
                  <ReplyForm
                    onCancel={() => setReplyFormFor(null)}
                    onSubmit={(text) => submitReply(c.id, "comment", c.id, text)}
                  />
                )}
                {shareFormFor === c.id && (
                  <ShareCommentForm
                    onCancel={() => setShareFormFor(null)}
                    onSubmit={(commentary) => submitShare(c, commentary)}
                  />
                )}
                {replies.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-3">
                    {replies.map((reply) => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        canReply={signedIn}
                        viewerId={viewerId}
                        onReply={(parentType, parentId, text) =>
                          submitReply(c.id, parentType, parentId, text)
                        }
                        onEdit={(replyId, text) => submitEditReply(c.id, replyId, text)}
                        onDelete={(replyId) => submitDeleteReply(c.id, replyId)}
                      />
                    ))}
                  </ul>
                )}
              </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
