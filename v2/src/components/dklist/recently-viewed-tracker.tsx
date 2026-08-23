"use client";

import { useEffect } from "react";
import { addRecentlyViewedBook } from "@/lib/recently-viewed";

/** Invisible - mounted on the book detail page purely for the localStorage side effect. */
export function RecentlyViewedTracker({
  id,
  name,
  slug,
  hasImage,
  writers,
}: {
  id: number;
  name: string;
  slug: string;
  hasImage: boolean;
  writers: string[];
}) {
  useEffect(() => {
    addRecentlyViewedBook({ id, name, slug, hasImage, writers });
  }, [id, name, slug, hasImage, writers]);

  return null;
}
