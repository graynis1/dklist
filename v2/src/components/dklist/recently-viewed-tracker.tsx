"use client";

import { useEffect } from "react";
import { addRecentlyViewedBook } from "@/lib/recently-viewed";

/** Invisible - mounted on the book detail page purely for the localStorage side effect. */
export function RecentlyViewedTracker({
  id,
  name,
  slug,
  writers,
}: {
  id: number;
  name: string;
  slug: string;
  writers: string[];
}) {
  useEffect(() => {
    addRecentlyViewedBook({ id, name, slug, writers });
  }, [id, name, slug, writers]);

  return null;
}
