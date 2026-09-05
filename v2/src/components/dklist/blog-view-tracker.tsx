"use client";

import { useEffect, useRef } from "react";
import { trackBlogViewAction } from "@/actions/blog";

/**
 * Fire-once view-count bump. Deliberately a tiny client component rather
 * than incrementing inside the page's own server-rendered content
 * function - a write during a GET render is a real footgun (bots/
 * prefetches/PPR re-evaluations would each count as a "view"), and this
 * is the same "mount-triggers-a-server-action" shape already used for
 * point-earning triggers elsewhere in this app. Renders nothing.
 */
export function BlogViewTracker({ blogId }: { blogId: number }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackBlogViewAction(blogId).catch(() => {});
  }, [blogId]);

  return null;
}
