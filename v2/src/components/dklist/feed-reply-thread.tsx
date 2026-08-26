"use client";

import { useState, useTransition } from "react";
import { MessageSquareIcon } from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { Button } from "@/components/ui/button";
import { addFeedReplyAction } from "@/app/akis/actions";
import type { CommentReply, SubCommentParentType } from "@/db/queries/comments";

/**
 * Real inline reply thread + composer, directly in the feed card - the
 * maintainer's explicit "sosyal medya platformuna dönüştür" ask meant
 * replying couldn't stay a link away to the entity's own comment section.
 * Single level only in this view (the underlying sub_comment data already
 * supports a second nested level, rendered on the entity's own page) - a
 * deliberate scope cut, not a data limitation.
 */
export function FeedReplyThread({
  parentType,
  parentId,
  initialReplies,
  signedIn,
}: {
  parentType: SubCommentParentType;
  parentId: number;
  initialReplies: CommentReply[];
  signedIn: boolean;
}) {
  const [replies, setReplies] = useState(initialReplies);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await addFeedReplyAction(parentType, parentId, trimmed);
      if (result.status && result.reply) {
        setReplies((prev) => [...prev, result.reply!]);
        setText("");
      } else {
        setError(result.message ?? "Gönderilemedi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquareIcon className="size-4" />
        {replies.length > 0 ? `${replies.length} yanıt` : "Yanıtla"}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-l-2 border-border py-1 pl-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2">
              <EntityAvatar id={r.authorUserId} name={r.authorUsername} size="size-6" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium">@{r.authorUsername}</span>
                <p className="text-sm leading-snug break-words text-foreground/90">{r.text}</p>
              </div>
            </div>
          ))}

          {signedIn ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Yanıt yaz..."
                  maxLength={2000}
                  className="flex-1 border-b border-border bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
                />
                <Button size="sm" variant="ghost" disabled={isPending || !text.trim()} onClick={submit}>
                  Gönder
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          ) : (
            replies.length === 0 && <p className="text-xs text-muted-foreground">Yanıtlamak için giriş yapın.</p>
          )}
        </div>
      )}
    </div>
  );
}
