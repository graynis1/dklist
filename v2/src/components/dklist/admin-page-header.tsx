import Link from "next/link";

/**
 * Shared header for every admin sub-page - replaces the bare
 * `<SectionLabel>Yönetim</SectionLabel><h1>...</h1>` pattern each of the
 * 24 admin tools had, none of which linked back to /admin. The header nav
 * does have a "Yönetim" link (AdminNavLink), but that's easy to miss and
 * isn't visible at all on a mobile viewport with the nav collapsed - a
 * real navigation gap for a panel with this many sub-pages, found during
 * the maintainer's explicit "make the admin panel genuinely good" pass.
 */
export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <Link
        href="/admin"
        className="w-fit text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
      >
        ← Yönetim Paneli
      </Link>
      <h1 className="font-heading text-3xl font-medium tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
