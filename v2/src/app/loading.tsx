/**
 * Real customer ask: "güzel bir preloader da ekle" - the app had no
 * route-level loading UI at all, so a navigation to a page with real
 * server work to do (a fresh Suspense boundary, an uncached data fetch)
 * showed nothing until content was ready, reading as "frozen" rather than
 * "loading" - exactly the impression a genuine slow page gives. This is
 * the actual Next.js App Router mechanism for this (shown instantly on
 * navigation, replaced once the route's own content is ready) - matches
 * the site's own editorial design language (BookCover's tone palette,
 * Fraunces serif wordmark) instead of a generic spinner.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-[0.35rem] bg-primary/15" />
        <div
          className="absolute inset-0 origin-left animate-[book-open_1.2s_ease-in-out_infinite] rounded-[0.35rem] bg-primary/70"
          style={{ transformStyle: "preserve-3d" }}
        />
      </div>
      <p className="font-heading text-sm tracking-[0.2em] text-muted-foreground uppercase">
        DKList
      </p>
      <style>{`
        @keyframes book-open {
          0%, 100% { transform: scaleX(1); opacity: 0.9; }
          50% { transform: scaleX(0.15); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
