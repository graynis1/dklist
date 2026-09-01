"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { searchBooksForHeaderAction } from "@/actions/search";
import type { SearchResultBook } from "@/db/queries/search";

/**
 * Real customer report: the header's search box only ever showed results
 * after hitting Enter and landing on /ara - "ararken altında gelmiyor
 * aranan veri bilgileri ancak tıklayınca". This adds a live, debounced
 * dropdown preview underneath while typing, each result with its own real
 * book cover thumbnail (a second explicit ask - "hangisini istediğini
 * anlamak için görseli olmalı") - Enter still submits to the full /ara
 * multi-category search page, this is a preview on top of that, not a
 * replacement for it.
 */
export function HeaderSearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultBook[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(`/ara?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <form onSubmit={submit} className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Kitap ara…"
          autoComplete="off"
          className="h-10 w-64 rounded-full bg-secondary/60 pl-9"
        />
      </form>
      {open && results.length > 0 && (
        <ul className="absolute top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover py-1.5 shadow-lg">
          {results.map((b) => (
            <li key={b.id}>
              <Link
                href={`/kitap/${b.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent"
              >
                <BookCover
                  title={b.name}
                  author={b.writers.join(", ")}
                  tone={toneForId(b.id)}
                  bookId={b.id}
                  hasImage={b.hasImage}
                  size="sm"
                  className="h-12 w-8 shrink-0"
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
          <li>
            <Link
              href={`/ara?q=${encodeURIComponent(query)}`}
              onClick={() => setOpen(false)}
              className="block border-t border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              &quot;{query}&quot; için tüm sonuçları gör →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
