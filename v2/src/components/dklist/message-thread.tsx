"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { XIcon, BookOpenIcon, TagIcon, SendIcon, PaperclipIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendMessageAction,
  fetchThreadAction,
  deleteMessageAction,
  searchBooksForAttachAction,
  searchStoreForAttachAction,
} from "@/app/mesajlar/actions";
import { formatRelativeTime } from "@/lib/utils";
import type { MessageItem } from "@/db/queries/messages";

interface AttachOption {
  id: number;
  label: string;
}

/**
 * Inline attach popover for the composer itself - separate from the
 * "Paylaş" share button (which sends from a book/store's own page). Search
 * result is sent immediately on click, same one-step feel as picking an
 * emoji, rather than accumulating a selection to submit later.
 */
function AttachPopover({ onSend, disabled }: { onSend: (type: "book" | "store", id: number, label: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"book" | "store">("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttachOption[]>([]);
  const [, startSearchTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      // Same startTransition-wrapped pattern EntitySearchPicker already uses
      // for this exact case - a bare setState here would otherwise trip
      // react-hooks/set-state-in-effect (synchronous setState in an effect
      // body can cascade renders).
      startSearchTransition(() => setResults([]));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const search = kind === "book" ? searchBooksForAttachAction : searchStoreForAttachAction;
      search(query).then(setResults);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, kind, open]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="Kitap veya ilan ekle"
      >
        <PaperclipIcon className="size-4" />
      </Button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => { setKind("book"); setQuery(""); setResults([]); }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${kind === "book" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              Kitap
            </button>
            <button
              type="button"
              onClick={() => { setKind("store"); setQuery(""); setResults([]); }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${kind === "store" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              Askıda Kitap
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === "book" ? "Kitap adı ara..." : "İlan başlığı ara..."}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSend(kind, r.id, r.label);
                      setOpen(false);
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    {kind === "book" ? <BookOpenIcon className="size-4 shrink-0 text-muted-foreground" /> : <TagIcon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

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

  function sendAttachment(kind: "book" | "store", id: number, label: string) {
    const defaultText = kind === "book" ? `Bu kitaba göz atar mısın? "${label}"` : `Bu ilana göz atar mısın? "${label}"`;
    startTransition(async () => {
      const result = await sendMessageAction(otherUsername, defaultText, kind, id);
      if (result.status) {
        // Refetch rather than hand-build the attachment shape - the server
        // already resolves the full snapshot (image/slug/title) via
        // buildAttachment(), no reason to duplicate that logic here.
        const refreshed = await fetchThreadAction(otherUsername);
        if (refreshed.status && refreshed.messages) setMessages(refreshed.messages);
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
        <AttachPopover onSend={sendAttachment} disabled={isPending} />
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
