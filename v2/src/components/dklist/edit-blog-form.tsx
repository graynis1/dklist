"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBlogAction } from "@/actions/blog";

export function EditBlogForm({
  blogId,
  slug,
  initialTitle,
  initialPreview,
  initialContent,
}: {
  blogId: number;
  slug: string;
  initialTitle: string;
  initialPreview: string;
  initialContent: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData: FormData) =>
        startTransition(async () => {
          const result = await updateBlogAction(blogId, formData);
          setStatus({ ok: result.status, message: result.message ?? (result.status ? "Güncellendi." : "Güncellenemedi.") });
          if (result.status && !result.pending) {
            router.refresh();
            router.push(`/blog/${slug}`);
          }
        })
      }
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        Başlık
        <Input name="title" defaultValue={initialTitle} required maxLength={255} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Önizleme
        <textarea
          name="preview"
          defaultValue={initialPreview}
          required
          rows={2}
          className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        İçerik
        <textarea
          name="content"
          defaultValue={initialContent}
          required
          rows={10}
          className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Kapak Resmi (değiştirmek için seçin, boş bırakabilirsiniz)
        <input name="image" type="file" accept=".png,.jpg,.jpeg,.webp" className="text-sm" />
      </label>
      {status && (
        <p className={`text-sm ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
