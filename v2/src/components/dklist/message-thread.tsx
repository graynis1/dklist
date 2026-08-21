"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendMessageAction, fetchThreadAction, deleteMessageAction } from "@/app/mesajlar/actions";
import type { MessageItem } from "@/db/queries/messages";

/**
 * Polls for new messages while the tab is visible - v1 itself has no
 * websocket/push infra either (its frontend has its own visibility-aware
 * polling hook), so this matches the real reference behavior rather than
 * under- or over-building relative to it.
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
    setMessages(initialMessages);
  }, [initialMessages, otherUsername]);

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
    <div className="flex h-[28rem] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz mesaj yok - ilk mesajı sen gönder.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              return (
                <li key={m.id} className={`group flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                  {mine && (
                    <button
                      type="button"
                      onClick={() => removeMessage(m.id)}
                      className="text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      aria-label="Mesajı sil"
                    >
                      ✕
                    </button>
                  )}
                  <span
                    className={`flex max-w-[75%] flex-col gap-2 rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.attachment && (
                      <a
                        href={`/${m.type === "book" ? "kitap" : "askida-kitap"}/${m.attachment.slug}`}
                        className="flex items-center gap-2 rounded-lg bg-background/20 p-1.5 hover:bg-background/30"
                      >
                        {m.attachment.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.attachment.image} alt="" className="size-10 rounded object-cover" />
                        )}
                        <span className="text-xs font-medium">{m.attachment.title}</span>
                      </a>
                    )}
                    {m.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        action={submit}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <Button type="submit" disabled={isPending || !text.trim()}>
          Gönder
        </Button>
      </form>
    </div>
  );
}
