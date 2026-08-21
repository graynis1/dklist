"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBlogAction } from "@/actions/blog";

export function DeleteBlogButton({ blogId }: { blogId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        className="text-destructive underline hover:opacity-80 disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            const result = await deleteBlogAction(blogId);
            if (result.status) {
              router.refresh();
              router.push("/bloglar");
            } else {
              setError(result.message ?? "Silinemedi.");
            }
          })
        }
      >
        Sil
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
