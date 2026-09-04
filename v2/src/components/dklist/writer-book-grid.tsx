"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating } from "@/components/dklist/star-rating";
import { groupWriterBooks } from "@/lib/writer-book-grouping";
import type { WriterBookItem } from "@/db/queries/writers";

/**
 * Real customer ask on the writer page: "Orijinal kitap yada en yüksek
 * puanı alan baskı ön yüzde görünüp çevirileri onun üstüne tıklanınca
 * açılabilir" - a writer with one real book but a dozen printings/
 * translations in the catalog (Sabahattin Ali has 61 rows here, per the
 * customer's own example) previously showed all 61 as separate grid tiles.
 * Groups by `originalBookId` (the real, well-populated grouping key on
 * this data - confirmed elsewhere in this project that `workId` isn't
 * reliably backfilled yet) - one card per real work, with the other
 * editions collapsed behind a "+N baskı" toggle instead of their own tile.
 */
export function WriterBookGrid({ books, writerName }: { books: WriterBookItem[]; writerName: string }) {
  const grouped = groupWriterBooks(books);

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
      {grouped.map((group) => (
        <WriterBookCard key={group.front.id} group={group} writerName={writerName} />
      ))}
    </div>
  );
}

function WriterBookCard({
  group,
  writerName,
}: {
  group: { front: WriterBookItem; others: WriterBookItem[] };
  writerName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { front, others } = group;

  return (
    <div className="flex flex-col gap-3">
      <Link href={`/kitap/${front.slug}`} className="flex flex-col gap-3">
        <BookCover
          title={front.name}
          author={writerName}
          tone={toneForId(front.id)}
          bookId={front.id}
          hasImage={front.hasImage}
          size="md"
          className="w-full"
        />
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{front.name}</p>
          <div className="flex items-center gap-1 text-xs">
            <StarRating value={front.score} />
            <span className="text-muted-foreground">{front.score.toFixed(1)}/10</span>
          </div>
        </div>
      </Link>

      {others.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <>
                Gizle <ChevronUpIcon className="size-3" />
              </>
            ) : (
              <>
                +{others.length} baskı <ChevronDownIcon className="size-3" />
              </>
            )}
          </button>
          {expanded && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/kitap/${o.slug}`} className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                    {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
