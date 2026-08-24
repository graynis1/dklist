import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { DuplicateReviewPanel, type DuplicateCandidateGroup } from "@/components/dklist/duplicate-review-panel";

// Same Kütüphaneci("Mod")/Admin gate as /admin/merge - reviewing candidates
// is read-only, but the point of the page is to route an admin toward the
// actual (destructive) merge tool, so it stays at the same permission level.
const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

/**
 * CLOUD-SANDBOX BUILD NOTE (see v2/PLAN.md's "Cloud-agent operating
 * constraints"): this page renders `DuplicateReviewPanel` (a pure,
 * DB-free component) against hand-written placeholder data shaped exactly
 * like `findDuplicateCandidatesDryRun()`'s real return type
 * (src/db/queries/duplicate-detection.ts), joined with the book/writer
 * display fields a real query would need to add (name/slug/writerNames -
 * the dry-run function itself only returns bookIds today). This sandbox
 * has no DATABASE_URL, so the real wiring - replacing PLACEHOLDER_GROUPS
 * below with a real call to findDuplicateCandidatesDryRun() plus a
 * book+writer join query for display fields - is left as TODO for a local
 * session that can run and Playwright-verify it against real data. Same
 * pattern this project already used once before (the homepage's
 * `demoBooks` placeholder, later wired to getTopBooks() in a follow-up
 * pass).
 */
const PLACEHOLDER_GROUPS: DuplicateCandidateGroup[] = [
  {
    matchType: "isbn",
    key: "9780261102217",
    books: [
      { id: 90210001, slug: "hobbit-cep-baskisi", name: "Hobbit (Cep Baskısı)", writerNames: ["J.R.R. Tolkien"] },
      { id: 90210002, slug: "hobbit-ozel-baskisi", name: "Hobbit (Özel Baskı)", writerNames: ["J.R.R. Tolkien"] },
    ],
  },
  {
    matchType: "normalized_title",
    key: "suc ve ceza",
    books: [
      { id: 90210101, slug: "suc-ve-ceza-cilt-1", name: "Suç ve Ceza - Cilt 1", writerNames: ["Fyodor Dostoyevski"] },
      { id: 90210102, slug: "suc-ve-ceza-genisletilmis-baski", name: "Suç ve Ceza (Genişletilmiş Baskı)", writerNames: ["Dostoyevski"] },
      { id: 90210103, slug: "suc-ve-ceza-karton-kapak", name: "Suç ve Ceza (Karton Kapak)", writerNames: ["Fyodor Dostoyevski"] },
    ],
  },
  {
    matchType: "fuzzy_title_author",
    key: "kucuk prens",
    score: 0.97,
    books: [
      { id: 90210201, slug: "kucuk-prens", name: "Küçük Prens", writerNames: ["Antoine de Saint-Exupéry"] },
      { id: 90210202, slug: "kucukk-prens", name: "Kücükk Prens", writerNames: ["A. de Saint-Exupery"] },
    ],
  },
];

export default function DuplicateReviewPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-16" />}>
        <DuplicateReviewContent />
      </Suspense>
    </div>
  );
}

async function DuplicateReviewContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <AdminPageHeader
        title="Mükerrer Kayıt Taraması"
        description="Olası mükerrer kitap kayıtlarını incele, gerçek olduğunu doğruladıktan sonra Kitap Birleştirme aracıyla birleştir."
      />

      <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Taslak sayfa - örnek veriyle çalışıyor.</strong> Aşağıdaki kayıtlar
        gerçek katalogdan değil, arayüzü göstermek için elle yazılmış örnek verilerdir. Gerçek tarama sorgusunu
        (<code className="font-mono">findDuplicateCandidatesDryRun()</code>) bu sayfaya bağlamak, gerçek DB
        erişimi olan bir yerel oturum gerektiriyor - bu bulut ortamının bir üretim veritabanı bağlantısı yok.
      </div>

      <DuplicateReviewPanel groups={PLACEHOLDER_GROUPS} />
    </div>
  );
}
