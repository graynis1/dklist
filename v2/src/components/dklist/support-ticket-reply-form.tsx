"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { replyToSupportTicketAction } from "@/actions/support";

/**
 * Real customer question (2026-09-09): "soru cevap yada yanıt gerekirse
 * çözüldü dışında yanıt nasıl ilerler iletişim kanalı olarak" - this is
 * that channel. Signed-in requesters get a real notification; email-only
 * (signed-out) tickets get an email - see replyToSupportTicket()'s own
 * doc comment.
 */
export function SupportTicketReplyForm({ id, adminReply }: { id: number; adminReply: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (adminReply && !open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-xs rounded-md bg-secondary p-2 text-xs text-secondary-foreground">
          <strong>Yanıtınız:</strong> {adminReply}
        </p>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Tekrar Yanıtla
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Yanıtla
      </Button>
    );
  }

  return (
    <div className="flex w-64 flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Yanıtınızı yazın..."
        className="min-h-20 rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-ring"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Vazgeç
        </Button>
        <Button
          size="sm"
          disabled={isPending || !text.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await replyToSupportTicketAction(id, text.trim());
              if (result.status) {
                setOpen(false);
                router.refresh();
              } else {
                setError(result.message ?? "Yanıt gönderilemedi.");
              }
            })
          }
        >
          Gönder
        </Button>
      </div>
    </div>
  );
}
