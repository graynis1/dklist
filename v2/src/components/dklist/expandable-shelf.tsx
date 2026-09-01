"use client";

import { Children, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

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
 */
export function ExpandableShelf({
  children,
  limit = 12,
  className = "flex flex-wrap gap-4",
}: {
  children: React.ReactNode;
  limit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className={className}>{visible}</div>
      {items.length > limit && (
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
              Tümünü Göster ({items.length}) <ChevronDownIcon className="size-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
