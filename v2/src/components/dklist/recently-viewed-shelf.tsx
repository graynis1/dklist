"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getRecentlyViewedBooks, type RecentlyViewedBook } from "@/lib/recently-viewed";

/**
 * Per-browser "recently viewed" shelf - purely client-side (localStorage),
 * so this can never be a Server Component. Renders nothing until mounted
 * (avoids a hydration mismatch, since the server has no idea what's in
 * this specific browser's localStorage). The read is deferred via a
 * transition (rather than a plain synchronous setState in the mount
 * effect) so it doesn't trigger an extra synchronous render pass right
 * after mount.
 */
export function RecentlyViewedShelf() {
  const [books, setBooks] = useState<RecentlyViewedBook[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => setBooks(getRecentlyViewedBooks()));
  }, [startTransition]);

  if (!books || books.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <SectionLabel>Son Baktıkların</SectionLabel>
      <div className="mt-4 flex flex-wrap gap-4">
        {books.map((b) => (
          <Link key={b.id} href={`/kitap/${b.slug}`} className="w-32 flex-shrink-0">
            <BookCover
              title={b.name}
              author={b.writers.join(", ") || "Yazar bilinmiyor"}
              tone={toneForId(b.id)}
              bookId={b.id}
              hasImage={b.hasImage}
              size="sm"
              className="w-full"
            />
            <p className="mt-2 line-clamp-2 text-xs font-medium">{b.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
