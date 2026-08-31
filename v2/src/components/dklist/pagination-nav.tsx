import Link from "next/link";
import { pageWindow } from "@/lib/pagination";

/**
 * Shared page-number row for every paginated list - a bounded window around
 * the current page (never the full page count, see pagination.ts's own doc
 * comment for why that matters at this data's scale) plus a real "İlk
 * Sayfa" jump link (customer's ask: "en başa al yada en sona al seçeneği
 * yok... en başa dön seçeneği ihtiyaç duyabilirler" - a "last page" jump
 * isn't useful here since these lists are sorted by relevance/popularity,
 * not something a "last page" has any meaning for).
 */
export function PaginationNav({
  page,
  lastPage,
  hrefForPage,
}: {
  page: number;
  lastPage: number;
  hrefForPage: (page: number) => string;
}) {
  if (lastPage <= 1) return null;

  const window = pageWindow(page, lastPage);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link href={hrefForPage(1)} className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          « İlk Sayfa
        </Link>
      )}
      {window.map((p) => (
        <Link
          key={p}
          href={hrefForPage(p)}
          className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
