"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteAuthorPostAction } from "@/actions/yazarhane";
import type { AuthorPost } from "@/db/queries/yazarhane";

export function AuthorPostRow({ post, canDelete }: { post: AuthorPost; canDelete: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Bu paylaşımı silmek istediğinizden emin misiniz?")) return;
    startTransition(async () => {
      await deleteAuthorPostAction(post.id, post.username);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-medium">{post.title}</p>
        <span className="text-xs text-muted-foreground">{post.createdDate}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.content}</p>
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-auto p-0 text-xs text-destructive hover:bg-transparent"
          disabled={isPending}
          onClick={remove}
        >
          Sil
        </Button>
      )}
    </div>
  );
}
