"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { XIcon, BookOpenIcon, TagIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessageAction, fetchThreadAction, deleteMessageAction } from "@/app/mesajlar/actions";
import { formatRelativeTime } from "@/lib/utils";
import type { MessageItem } from "@/db/queries/messages";

/**
 * Polls for new messages while the tab is visible - v1 itself has no
 * websocket/push infra either (its frontend has its own visibility-aware
 * polling hook), so this matches the real reference behavior rather than
 * under- or over-building relative to it.
 *
 * The caller must render this with `key={otherUsername}` so switching
 * conversations remounts it fresh from the new `initialMessages` prop,
 * rather than needing a sync-on-prop-change effect here.
 */
const POLL_MS = 5000;

export function MessageThread({
  currentUserId,
  otherUsername,
  initialMessages,
}: {
  currentUserId: number;
  otherUsername: string;
  initialMessages: MessageItem[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchThreadAction(otherUsername).then((result) => {
        if (result.status && result.messages) {
          setMessages(result.messages);
        }
      });
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [otherUsername]);

  function removeMessage(id: number) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      await deleteMessageAction(id);
    });
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    startTransition(async () => {
      const result = await sendMessageAction(otherUsername, trimmed);
      if (result.status && result.sentId) {
        setMessages((prev) => [
          ...prev,
          {
            id: result.sentId!,
            text: trimmed,
            senderId: currentUserId,
            createdAt: new Date().toISOString(),
            type: "text",
            attachment: null,
          },
        ]);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz mesaj yok - ilk mesajı sen gönder.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const mine = m.senderId === currentUserId;
              const prev = messages[i - 1];
              const grouped = prev && prev.senderId === m.senderId;
              return (
                <li
                  key={m.id}
                  className={`group flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"} ${grouped ? "-mt-2" : ""}`}
                >
                  <div className={`flex items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    {mine && (
                      <button
                        type="button"
                        onClick={() => removeMessage(m.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Mesajı sil"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                    <div
                      className={`flex max-w-[19rem] flex-col gap-2 rounded-2xl px-3.5 py-2.5 text-sm ${
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {m.attachment && (
                        <a
                          href={`/${m.type === "book" ? "kitap" : "askida-kitap"}/${m.attachment.slug}`}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2 text-card-foreground transition-colors hover:bg-accent"
                        >
                          {m.attachment.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.attachment.image}
                              alt=""
                              className="size-10 shrink-0 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                              {m.type === "book" ? (
                                <BookOpenIcon className="size-4 text-muted-foreground" />
                              ) : (
                                <TagIcon className="size-4 text-muted-foreground" />
                              )}
                            </span>
                          )}
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[0.65rem] font-medium text-muted-foreground uppercase">
                              {m.type === "book" ? "Kitap" : "İlan"}
                            </span>
                            <span className="truncate text-xs font-medium">{m.attachment.title}</span>
                          </span>
                        </a>
                      )}
                      {m.text && <p className="leading-relaxed break-words">{m.text}</p>}
                    </div>
                  </div>
                  {m.createdAt && (
                    <span className="px-1 text-[0.65rem] text-muted-foreground/70">
                      {formatRelativeTime(m.createdAt)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      <form action={submit} className="flex gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-ring"
        />
        <Button type="submit" size="icon" disabled={isPending || !text.trim()} aria-label="Gönder">
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
