"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Real customer report (2026-09-10): "bazı yerlere tıkladığım zaman ...
 * donma olayı gibi ... sayfayı yenilemem gerekebiliyor tıkladığım yere
 * gitmesi için". On a slow connection / slow device, clicking a link
 * starts an RSC fetch that can take a second or two with nothing visible
 * happening - the app's `loading.tsx` only shows for segments that have
 * real server work AND their own loading boundary, so a lot of
 * navigations show no feedback at all and read as an ignored click.
 *
 * A thin top bar that appears the instant an internal link is clicked and
 * finishes when the route actually changes - the same reassurance every
 * major site gives, no dependency (nprogress etc. need manual App Router
 * wiring anyway). Click interception rather than patching history so it
 * also covers browser back/forward and programmatic router.push via the
 * pathname/searchParams effect below.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route actually changed -> finish the bar. This is genuine external-
  // system synchronization (the router is the external system, a pathname
  // change is its state change) - exactly what an effect is for - not the
  // derived-state anti-pattern the lint rule targets; the transition is
  // bounded (loading -> done -> idle, two renders, no cascade).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => (s === "loading" ? "done" : "idle"));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      // External link, mailto:, tel:, etc. - browser handles it, no SPA nav.
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same URL (no navigation) - don't flash the bar.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setState("loading");
      // Safety net: if a navigation somehow never resolves (error, aborted),
      // don't leave the bar stuck forever.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState("done"), 10000);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5" aria-hidden="true">
      <div
        className="h-full bg-primary transition-[width,opacity] ease-out"
        style={
          state === "loading"
            ? { width: "80%", opacity: 1, transitionDuration: "8s" }
            : { width: "100%", opacity: 0, transitionDuration: "300ms" }
        }
      />
    </div>
  );
}
