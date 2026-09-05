"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchBooksForLinkAction } from "@/app/askida-kitap/actions";
import { BookCover, toneForId } from "@/components/dklist/book-cover";

interface BookMatch {
  id: number;
  name: string;
  slug: string;
  writers: string[];
  hasImage: boolean;
}

/** Optional "bu ilan hangi kitapla ilgili?" search-select for the Askıda
 * Kitap create form (customer's marketplace ask). Carries the chosen book's
 * id via a hidden input so the normal form action picks it up like any
 * other field - the catalog cover auto-pull and the book page's "İkinci El
 * Bulundu" link both key off this being set.
 *
 * `initialBook`, when passed, pre-selects a book instead of showing the
 * empty search box - real gap found via customer report: coming from a
 * book page's "Askıya Ekle" button required re-searching for the exact
 * same book from scratch even though it was already known. */
export function BookLinkPicker({ initialBook }: { initialBook?: BookMatch | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookMatch[]>([]);
  const [selected, setSelected] = useState<BookMatch | null>(initialBook ?? null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      startTransition(() => setResults([]));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchBooksForLinkAction(query);
        setResults(matches);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm">
        <input type="hidden" name="bookId" value={selected.id} />
        <BookCover
          title={selected.name}
          author={selected.writers.join(", ")}
          tone={toneForId(selected.id)}
          bookId={selected.id}
          hasImage={selected.hasImage}
          size="sm"
          className="w-10 shrink-0"
        />
        <span className="flex-1">
          <span className="font-medium">{selected.name}</span>
          {selected.writers.length > 0 && (
            <span className="text-muted-foreground"> — {selected.writers.join(", ")}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Kaldır
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor="book-link-search" className="text-sm text-muted-foreground">
        İlgili kitap (opsiyonel) - kapağı otomatik kullanılır
      </label>
      <input
        id="book-link-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kitap ara..."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      />
      {(results.length > 0 || isPending) && (
        <ul className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-md">
          {results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(b);
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <BookCover
                  title={b.name}
                  author={b.writers.join(", ")}
                  tone={toneForId(b.id)}
                  bookId={b.id}
                  hasImage={b.hasImage}
                  size="sm"
                  className="w-9 shrink-0"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{b.name}</span>
                  {b.writers.length > 0 && (
                    <span className="text-xs text-muted-foreground">{b.writers.join(", ")}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
