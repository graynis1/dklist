"use client";

import { useEffect, useRef } from "react";
import { trackVideoViewAction } from "@/actions/videos";

/** Same fire-once, mount-triggers-a-server-action shape as BlogViewTracker
 * - a write during a GET render (bots/prefetches/PPR re-evaluations) would
 * each count as a "view" otherwise. Renders nothing. */
export function VideoViewTracker({ videoId }: { videoId: number }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackVideoViewAction(videoId).catch(() => {});
  }, [videoId]);

  return null;
}
