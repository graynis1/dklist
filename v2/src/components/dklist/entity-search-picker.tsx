"use client";

import { useEffect, useRef, useState, useTransition } from "react";

interface Option {
  id: number;
  label: string;
}

/** Generic search-select for the book-submission form (publisher/writer/
 * translator/category/parent-book) - reuses the same debounced-search
 * pattern as BookLinkPicker (Askıda Kitap). `multi` controls whether
 * multiple options can be chosen at once; the chosen ids are carried via a
 * comma-joined hidden input named `name`, picked up by the normal form
 * submit like any other field. */
export function EntitySearchPicker({
  name,
  label,
  placeholder = "Ara...",
  multi = false,
  searchAction,
  initialSelected = [],
}: {
  name: string;
  label: string;
  placeholder?: string;
  multi?: boolean;
  searchAction: (query: string) => Promise<Option[]>;
  /** Pre-populates the picker when editing something that already has a
   * value (e.g. an existing book's writers/categories) - plain create forms
   * just omit this and start empty as before. */
  initialSelected?: Option[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option[]>(initialSelected);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      startTransition(() => setResults([]));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchAction(query);
        setResults(matches.filter((m) => !selected.some((s) => s.id === m.id)));
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pick(option: Option) {
    if (multi) {
      setSelected((prev) => [...prev, option]);
      setQuery("");
      setResults([]);
    } else {
      setSelected([option]);
      setQuery("");
      setResults([]);
    }
  }

  function remove(id: number) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input type="hidden" name={name} value={selected.map((s) => s.id).join(",")} />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {s.label}
              <button type="button" onClick={() => remove(s.id)} className="hover:text-destructive">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {(multi || selected.length === 0) && (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          {results.length > 0 && (
            <ul className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-md">
              {results.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
