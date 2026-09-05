import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getWriterBySlug } from "@/db/queries/writers";
import { findDuplicateCandidatesForWriter } from "@/db/queries/duplicate-detection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";

const ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const MATCH_LABEL: Record<string, string> = {
  isbn: "Aynı ISBN",
  normalized_title: "Aynı başlık",
  fuzzy_title_author: "Benzer başlık",
};

/**
 * Real customer report (2026-09-05, the "Orhan Pamuk / Elurra" example):
 * the same book listed 2-3 times on one writer's page, asked point-blank
 * "tarama şansı oluyor mu?" - see findDuplicateCandidatesForWriter()'s own
 * doc comment for why this is scoped per-writer (cheap, real-time) rather
 * than a full-catalog scan, and why it's read-only (no merge action here
 * yet - book has far more referencing tables than the existing
 * writer/work/publisher merge tool handles, and a correct merge needs to
 * reassign that data, not delete it - a bigger, separate feature).
 */
export default function DuplicateScanPage({ searchParams }: PageProps<"/admin/mukerrer-tarama">) {
  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Suspense fallback={null}>
          <ScanContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ScanContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/mukerrer-tarama">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED_ROLES)) redirect("/");

  const { slug: slugParam } = await searchParams;
  const slug = typeof slugParam === "string" ? slugParam.trim() : "";
  const writer = slug ? await getWriterBySlug(slug) : null;
  const candidates = writer ? await findDuplicateCandidatesForWriter(writer.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Mükerrer Tarama"
        description="Bir yazarın kitaplarında aynı ISBN, aynı başlık veya çok benzer başlıkla mükerrer görünen kayıtları bulur. Sadece tarar, hiçbir şeyi değiştirmez - birleştirme kararını sen verirsin."
      />

      <form className="flex gap-2">
        <Input
          name="slug"
          defaultValue={slug}
          placeholder="Yazar sayfa adresi (örn. orhan-pamuk)"
          className="flex-1"
        />
        <Button type="submit">Tara</Button>
      </form>

      {slug && !writer && <p className="text-sm text-destructive">Bu adreste bir yazar bulunamadı.</p>}

      {writer && (
        <>
          <p className="text-sm text-muted-foreground">
            <Link href={`/yazar/${writer.slug}`} className="underline hover:text-foreground" target="_blank">
              {writer.name}
            </Link>{" "}
            sayfası tarandı.
          </p>

          {!candidates || candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mükerrer görünen bir şey bulunamadı.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {candidates.map((c, i) => (
                <li key={i} className="rounded-lg border border-border p-4">
                  <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">{MATCH_LABEL[c.matchType]}</p>
                  <ul className="flex flex-col gap-2">
                    {c.books.map((b) => (
                      <li key={b.id} className="flex items-center gap-2 text-sm">
                        <Link href={`/kitap/${b.slug}`} target="_blank" className="hover:underline">
                          {b.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          #{b.id}
                          {!b.hasImage && " · görselsiz"}
                        </span>
                        <Link href={`/admin/kitaplar?search=${encodeURIComponent(b.name)}`} target="_blank" className="ml-auto text-xs text-primary hover:underline">
                          Düzenle →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
