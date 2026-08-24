import Link from "next/link";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Phase 5 roadmap item 5 ("manual admin approval panel") - pure
 * presentational review UI for the candidate duplicate groups
 * `findDuplicateCandidatesDryRun()` (src/db/queries/duplicate-detection.ts)
 * already produces. Deliberately read-only: it does NOT perform a merge
 * itself. Actually merging two catalog entries means repointing
 * `book.work_id` (see src/db/queries/merge.ts's `mergeWorks()`), which
 * operates on `work` ids, not `book` ids - the dry-run's candidate groups
 * are grouped by `book.id` only, so turning "these N books look like
 * duplicates" into "merge work A into work B" needs a real per-book
 * `work_id` lookup this pure component has no way to do safely. Rather
 * than guess at that mapping, this panel points an admin at each
 * candidate's own admin edit page and the existing, already-correct
 * `/admin/merge` tool to complete the merge by hand once they've confirmed
 * it's a real duplicate.
 */
export type DuplicateMatchType = "isbn" | "normalized_title" | "fuzzy_title_author";

export interface DuplicateCandidateBook {
  id: number;
  slug: string;
  name: string;
  writerNames: string[];
}

export interface DuplicateCandidateGroup {
  matchType: DuplicateMatchType;
  /** The normalized ISBN/title key (or, for fuzzy matches, the seed book's normalized title) the group was found under. */
  key: string;
  /** Present only for fuzzy_title_author groups - the titleAuthorSimilarity() score (0-1) that triggered the match. */
  score?: number;
  books: DuplicateCandidateBook[];
}

const MATCH_TYPE_LABEL: Record<DuplicateMatchType, string> = {
  isbn: "Aynı ISBN",
  normalized_title: "Aynı normalize başlık",
  fuzzy_title_author: "Bulanık başlık+yazar eşleşmesi",
};

const MATCH_TYPE_VARIANT: Record<DuplicateMatchType, "default" | "secondary" | "outline"> = {
  isbn: "default",
  normalized_title: "secondary",
  fuzzy_title_author: "outline",
};

export function DuplicateReviewPanel({ groups }: { groups: DuplicateCandidateGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Aday mükerrer kayıt bulunamadı.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {groups.map((group, i) => (
        <li key={`${group.matchType}:${group.key}:${i}`}>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center gap-2">
              <Badge variant={MATCH_TYPE_VARIANT[group.matchType]}>{MATCH_TYPE_LABEL[group.matchType]}</Badge>
              {group.score != null && (
                <Badge variant="outline">Benzerlik: %{Math.round(group.score * 100)}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Anahtar: <code className="font-mono">{group.key}</code> · {group.books.length} kayıt
              </span>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {group.books.map((b) => (
                <div key={b.id} className="flex w-28 flex-col items-center gap-2 text-center">
                  <BookCover title={b.name} author={b.writerNames.join(", ") || "—"} tone={toneForId(b.id)} size="sm" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-balance">{b.name}</span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {b.writerNames.join(", ") || "Yazar yok"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[0.65rem]">
                    <Link href={`/admin/kitaplar/${b.id}`} className="text-primary underline-offset-2 hover:underline">
                      Admin düzenle
                    </Link>
                    <Link href={`/kitap/${b.slug}`} className="text-muted-foreground underline-offset-2 hover:underline">
                      Kitap sayfası
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
