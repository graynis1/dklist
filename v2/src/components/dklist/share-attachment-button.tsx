"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { shareAttachmentAction } from "@/app/mesajlar/actions";

/**
 * v1's real UX is an in-composer attachment picker inside an existing chat
 * thread (browse/search a book or listing while writing a message).
 * Building that full picker is real new UI scope; this is the deliberately
 * lighter alternative recommended in PLAN.md - a "Paylaş" button on the
 * book/store page itself, mirroring the existing "Mesaj Yaz" profile
 * pattern: type a username, send. Same underlying attachment-message
 * machinery (MessageTypeEnum::BookAttachment/StoreAttachment), just a
 * simpler entry point than a full picker.
 */
export function ShareAttachmentButton({
  attachmentType,
  referencedId,
}: {
  attachmentType: "book" | "store";
  referencedId: number;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status?.ok) {
    return <p className="text-xs text-muted-foreground">Gönderildi.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        Paylaş
      </button>
      {open && (
        <div className="flex w-64 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Kime göndermek istersin?
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kullanıcı adı"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-ring"
            />
          </label>
          {status && !status.ok && <p className="text-xs text-destructive">{status.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!username.trim() || isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await shareAttachmentAction(username.trim(), attachmentType, referencedId);
                  setStatus({ ok: result.status, message: result.message ?? "Gönderildi." });
                })
              }
            >
              Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
