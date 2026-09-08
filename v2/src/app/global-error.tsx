"use client";

import { useEffect } from "react";
import { logClientErrorAction } from "@/actions/client-error";

/**
 * Root client-side crash boundary - `onRequestError` in instrumentation.ts
 * only ever sees server-side errors (Server Components/Route Handlers/
 * Server Actions). A render crash that only happens after hydration, in
 * a Client Component, never reaches that hook at all - this is the
 * counterpart for exactly that case. Must render its own <html>/<body>
 * since it fully replaces the root layout when it fires.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    logClientErrorAction(error.message, error.stack ?? null, error.digest ?? null, window.location.href).catch(() => {
      // Logging the error must never itself throw and mask the original.
    });
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center font-sans">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Bir şeyler ters gitti</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyebilirsin.
        </p>
        {/* Plain <a>, not <Link> - this boundary replaces the entire root
            layout (including the router context Link depends on), so it
            must stay renderable even if the app's own routing is what
            broke. Matches Next.js's own documented global-error pattern. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-sm font-medium underline">
          Ana sayfaya dön
        </a>
      </body>
    </html>
  );
}
