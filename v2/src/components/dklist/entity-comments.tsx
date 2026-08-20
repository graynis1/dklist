"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { BookComment, CommentReply, SubCommentParentType } from "@/db/queries/comments";
import type { CommentLikeState } from "@/db/queries/comment-likes";
import { toggleCommentLikeAction } from "@/actions/comment-likes";

function CommentLikeButton({
  commentId,
  signedIn,
  initialState,
}: {
  commentId: number;
  signedIn: boolean;
  initialState: CommentLikeState;
}) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={!signedIn || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleCommentLikeAction(commentId);
          if (result.status && result.liked !== undefined) {
            setState((prev) => ({
              liked: result.liked!,
              count: prev.count + (result.liked ? 1 : -1),
            }));
          }
        })
      }
      className="w-fit text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <span className={state.liked ? "text-primary" : ""}>{state.liked ? "♥" : "♡"}</span>{" "}
      {state.count > 0 ? state.count : "Beğen"}
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

function ReplyItem({
  reply,
  canReply,
  onReply,
}: {
  reply: CommentReply;
  canReply: boolean;
  onReply: (parentType: SubCommentParentType, parentId: number, text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <li className="flex flex-col gap-1 border-l-2 border-border pl-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">@{reply.authorUsername}</span>
      </div>
      <p className="text-sm leading-relaxed">{reply.text}</p>
      {canReply && (
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Yanıtla
        </button>
      )}
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
            <ReplyItem key={nested.id} reply={nested} canReply={false} onReply={onReply} />
          ))}
        </ul>
      )}
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
export function EntityComments({
  signedIn,
  initialComments,
  initialRepliesByComment,
  commentLikes,
  addCommentAction,
  addReplyAction,
  placeholder = "Ne düşünüyorsunuz?",
  submitLabel = "Yorum Yap",
  emptyMessage = "Henüz yorum yok.",
}: {
  signedIn: boolean;
  initialComments: BookComment[];
  initialRepliesByComment: Record<number, CommentReply[]>;
  commentLikes: Record<number, CommentLikeState>;
  addCommentAction: (text: string) => Promise<{ status: boolean; message?: string; commentId?: number }>;
  addReplyAction: (
    parentType: SubCommentParentType,
    parentId: number,
    text: string,
  ) => Promise<{ status: boolean; message?: string; replyId?: number }>;
  placeholder?: string;
  submitLabel?: string;
  emptyMessage?: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [repliesByComment, setRepliesByComment] = useState(initialRepliesByComment);
  const [error, setError] = useState<string | null>(null);
  const [replyFormFor, setReplyFormFor] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
          parentType,
          parentId,
          replies: [],
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
            return (
              <li key={c.id} className="flex flex-col gap-1 border-b border-border pb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">@{c.authorUsername}</span>
                  <span className="text-muted-foreground">{c.date}</span>
                </div>
                <p className="text-sm leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-3">
                  <CommentLikeButton
                    commentId={c.id}
                    signedIn={signedIn}
                    initialState={commentLikes[c.id] ?? { count: 0, liked: false }}
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
                </div>
                {replyFormFor === c.id && (
                  <ReplyForm
                    onCancel={() => setReplyFormFor(null)}
                    onSubmit={(text) => submitReply(c.id, "comment", c.id, text)}
                  />
                )}
                {replies.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-3">
                    {replies.map((reply) => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        canReply={signedIn}
                        onReply={(parentType, parentId, text) =>
                          submitReply(c.id, parentType, parentId, text)
                        }
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
