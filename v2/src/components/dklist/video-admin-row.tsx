"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateVideoFieldAction, deleteVideoAction } from "@/app/admin/videolar/actions";
import type { VideoListItem } from "@/db/queries/videos";

export function VideoAdminRow({ video }: { video: VideoListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveField(mode: "title" | "link", value: string) {
    startTransition(async () => {
      const result = await updateVideoFieldAction(video.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteVideoAction(video.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-1 flex-col gap-2">
        <Input
          defaultValue={video.title}
          placeholder="Başlık"
          disabled={isPending}
          onBlur={(e) => e.target.value !== video.title && saveField("title", e.target.value)}
        />
        <Input
          defaultValue={video.youtubeVideoId ? `https://youtu.be/${video.youtubeVideoId}` : ""}
          placeholder="YouTube linki"
          disabled={isPending}
          onBlur={(e) => saveField("link", e.target.value)}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link href={`/video/${video.slug}`} className="underline hover:text-foreground">
            Görüntüle
          </Link>
          <span className="flex items-center gap-1">
            <EyeIcon className="size-3.5" />
            {video.viewCount}
          </span>
          <span>{video.createdDate}</span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
