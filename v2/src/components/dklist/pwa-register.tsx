"use client";

import { useEffect } from "react";

/** Registers the minimal offline-fallback service worker (see
 * public/sw.js). Silently no-ops if the browser doesn't support service
 * workers - never blocks or errors the rest of the page. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
