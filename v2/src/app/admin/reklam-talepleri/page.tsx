import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getAdInquiries } from "@/db/queries/ad-inquiry";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { AdInquiryHandledToggle } from "@/components/dklist/ad-inquiry-handled-toggle";

const ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const STATUS_TABS: { value: "all" | "open" | "handled"; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "handled", label: "Çözüldü" },
  { value: "all", label: "Tümü" },
];

export default function AdminAdInquiriesPage({ searchParams }: PageProps<"/admin/reklam-talepleri">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminAdInquiriesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminAdInquiriesContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/reklam-talepleri">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED_ROLES)) redirect("/");

  const params = await searchParams;
  const statusFilter = (["all", "open", "handled"] as const).includes(params.status as never)
    ? (params.status as "all" | "open" | "handled")
    : "open";

  const inquiries = await getAdInquiries(statusFilter);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Reklam Talepleri</h1>
        <p className="text-sm text-muted-foreground">
          /reklam-ver üzerinden gelen işbirliği talepleri - {inquiries.length} kayıt.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reklam-talepleri?status=${tab.value}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              statusFilter === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {statusFilter === "all" ? "Henüz bir talep yok." : "Bu durumda bir talep yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {inquiries.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-1 text-sm">
                <div className="text-xs text-muted-foreground">{i.createdAt}</div>
                <p>
                  <strong>{i.name}</strong>
                  {i.company && ` — ${i.company}`} · {i.email}
                </p>
                <p className="text-muted-foreground">{i.message}</p>
              </div>
              <AdInquiryHandledToggle id={i.id} initialHandled={i.handled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
