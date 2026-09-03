"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlusIcon, XIcon, BookOpenIcon } from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { Button } from "@/components/ui/button";
import { createFeedPostAction } from "@/app/akis/actions";
import { searchParentBooksAction } from "@/app/kitap/yeni/actions";
import type { FrameTier } from "@/lib/profile-frame-tier";

/**
 * The "what's on your mind?" compose box - the one piece /akis genuinely
 * never had before, since every existing way to post something (a book
 * review, a quote) required going to that entity's own page first. Real
 * social platforms let you post from the feed itself; this is that.
 *
 * A real `<form>` (not manually-built FormData) so EntitySearchPicker's own
 * hidden `bookId` input is picked up automatically on submit, same as
 * every other form using that picker (set-book-of-month-form.tsx etc.).
 */
export function FeedComposer({
  userId,
  username,
  userImage,
  profileFrame,
  frameTier,
  highestBadge,
}: {
  userId: number;
  username: string;
  userImage: string | null;
  profileFrame?: string | null;
  frameTier?: FrameTier;
  highestBadge?: { name: string; threshold: number } | null;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function pickImage(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFeedPostAction(formData);
      if (result.status) {
        setText("");
        clearImage();
        setShowBookPicker(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Gönderilemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <EntityAvatar
        id={userId}
        name={username}
        image={userImage}
        size="size-9"
        className="shrink-0"
        profileFrame={profileFrame}
        frameTier={frameTier}
        highestBadge={highestBadge}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aklından ne geçiyor? Bir kitap önerisi, bir düşünce paylaş... (Paylaşımlar kitap/okumayla ilgili olmalı)"
          rows={2}
          maxLength={2000}
          className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        {imagePreview && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="max-h-64 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
              aria-label="Görseli kaldır"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}
        {showBookPicker && (
          <div className="rounded-lg border border-border p-3">
            <EntitySearchPicker name="bookId" label="Kitap ekle" searchAction={searchParentBooksAction} />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              name="image"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground"
            >
              <ImagePlusIcon className="size-4" />
              Görsel Ekle
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowBookPicker((s) => !s)}
              className="text-muted-foreground"
            >
              <BookOpenIcon className="size-4" />
              Kitap Ekle
            </Button>
          </div>
          <Button type="submit" size="sm" disabled={isPending || (!text.trim() && !imageFile && !showBookPicker)}>
            {isPending ? "Paylaşılıyor..." : "Paylaş"}
          </Button>
        </div>
      </div>
    </form>
  );
}
