"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addCommentAction } from "@/app/kitap/[slug]/actions";
import type { BookComment } from "@/db/queries/comments";

export function BookComments({
  bookId,
  signedIn,
  initialComments,
}: {
  bookId: number;
  signedIn: boolean;
  initialComments: BookComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(bookId, text);
      if (result.status) {
        formRef.current?.reset();
        // Optimistic prepend - the real list re-syncs from the server on the
        // next navigation/reload; this just avoids the comment vanishing
        // from view until then.
        setComments((prev) => [
          {
            id: -Date.now(),
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
            placeholder="Bu kitap hakkında ne düşünüyorsunuz?"
            required
            minLength={2}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-fit">
            Yorum Yap
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
        <p className="text-muted-foreground">
          Henüz yorum yok — bu kitabı ilk değerlendiren sen ol.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 border-b border-border pb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">@{c.authorUsername}</span>
                <span className="text-muted-foreground">{c.date}</span>
              </div>
              <p className="text-sm leading-relaxed">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
