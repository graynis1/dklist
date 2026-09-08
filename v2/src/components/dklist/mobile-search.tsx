"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { searchBooksForHeaderAction } from "@/actions/search";
import type { SearchResultBook } from "@/db/queries/search";

/**
 * Real customer report (follow-up on the desktop live-search fix): the
 * mobile header search icon only ever linked out to the static /ara form -
 * "mobilde... aranan verileri ve görseli gelmiyor normal sitedeki gibi"
 * (unlike the desktop header, nothing shows while typing). This is the
 * `lg:hidden` counterpart to HeaderSearchBox - same debounced action, same
 * cover-thumbnail results - as a full-width overlay panel under the header
 * instead of an inline dropdown, since there's no room for that at mobile
 * widths.
 */
export function MobileSearchTrigger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultBook[]>([]);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      startTransition(() => setResults([]));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchBooksForHeaderAction(query);
        setResults(matches);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/ara?q=${encodeURIComponent(query)}`);
    close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Ara"
      >
        <SearchIcon className="size-5" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex h-20 items-center gap-3 border-b border-border px-4">
            <form onSubmit={submit} className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kitap ara…"
                autoComplete="off"
                className="h-11 w-full rounded-full bg-secondary/60 pl-9"
              />
            </form>
            <button
              type="button"
              onClick={close}
              aria-label="Kapat"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="mx-auto max-w-3xl px-4 py-2">
            {query.trim().length >= 2 && results.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
            )}
            <ul className="flex flex-col">
              {results.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/kitap/${b.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <BookCover
                      title={b.name}
                      author={b.writers.join(", ")}
                      tone={toneForId(b.id)}
                      bookId={b.id}
                      hasImage={b.hasImage}
                      size="sm"
                      className="h-14 w-9 shrink-0"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{b.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {b.writers.join(", ") || "Yazar bilinmiyor"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {query.trim().length >= 2 && (
              <Link
                href={`/ara?q=${encodeURIComponent(query)}`}
                onClick={close}
                className="mt-2 block px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                &quot;{query}&quot; için tüm sonuçları gör →
              </Link>
            )}
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
