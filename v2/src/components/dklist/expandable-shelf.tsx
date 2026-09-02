"use client";

import { Children, isValidElement, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react";

/**
 * Real customer ask: "Okudum okuyacağım ve diğer başlıklar bir miktar
 * görünüp sonra tümünü göster şeklinde mi? ... Öncekinde yapmıştık" (v1
 * had this) - every reading-status shelf on a profile rendered every book
 * at once with a plain flex-wrap, no cap at all, so a heavy reader's
 * profile could dump 200+ covers into one section. Generic wrapper so this
 * applies to every shelf-shaped list on the profile ("Profildeki tüm
 * başlıklar için kullanılabilir" - the customer's own explicit ask), not
 * just reading status - takes already-rendered items as children (a
 * Server Component can pass rendered JSX into a Client Component's
 * children just fine) and only the show/hide toggle needs to be a client
 * component at all.
 *
 * `searchable`, when true, adds a client-side text filter - a second,
 * related customer ask ("okudum okuyorum kütüphanem blog... arama
 * butonu koymuştuk... onuda burada da eklemeliyiz", referencing search
 * boxes already built elsewhere on the site). Each child must carry a
 * `data-search` string prop (the title/name to match against) for this
 * to work - filtering reads that prop rather than the rendered text, so
 * it works the same way regardless of a child's actual DOM shape.
 */
export function ExpandableShelf({
  children,
  limit = 12,
  className = "flex flex-wrap gap-4",
  searchable = false,
}: {
  children: React.ReactNode;
  limit?: number;
  className?: string;
  searchable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const allItems = Children.toArray(children);

  const filtered = query.trim()
    ? allItems.filter((child) => {
        if (!isValidElement<{ "data-search"?: string }>(child)) return true;
        const label = child.props["data-search"];
        return typeof label === "string" ? label.toLowerCase().includes(query.trim().toLowerCase()) : true;
      })
    : allItems;

  const visible = expanded || query.trim() ? filtered : filtered.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      {searchable && allItems.length > limit && (
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İçinde ara..."
            className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-8 text-xs outline-none focus:border-ring"
          />
        </div>
      )}
      <div className={className}>{visible}</div>
      {query.trim() && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground">Eşleşen sonuç yok.</p>
      )}
      {!query.trim() && allItems.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              Daha Az Göster <ChevronUpIcon className="size-3.5" />
            </>
          ) : (
            <>
              Tümünü Göster ({allItems.length}) <ChevronDownIcon className="size-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
