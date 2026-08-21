import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getNotices, type NoticeTypeFilter } from "@/db/queries/notices";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { NoticeActions } from "@/components/dklist/notice-actions";

const NOTICE_ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const TABS: { value: NoticeTypeFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "comment", label: "Yorum Şikayetleri" },
  { value: "user_report", label: "Kullanıcı Şikayetleri" },
  { value: "book_data_error", label: "Kitap Veri Hataları" },
  { value: "auto_flag", label: "Otomatik Bayraklar" },
];

export default function AdminNoticesPage({
  searchParams,
}: PageProps<"/admin/sikayetler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminNoticesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminNoticesContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/sikayetler">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }
  if (!hasRole(session.user.userType, NOTICE_ALLOWED_ROLES)) {
    redirect("/");
  }

  const params = await searchParams;
  const type = (params.type as NoticeTypeFilter) ?? "all";
  const page = Number(params.page ?? "1") || 1;

  const { items, total, lastPage } = await getNotices(page, 40, type);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Şikayetler</h1>
        <p className="text-sm text-muted-foreground">
          Kullanıcılardan gelen yorum, profil ve kitap veri hatası bildirimleri - toplam {total} kayıt.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/sikayetler?type=${tab.value}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              type === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu kategoride şikayet yok.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{n.createdAt}</span>
                  {n.isResolved && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      Çözüldü
                    </span>
                  )}
                </div>
                {n.type === "user_report" ? (
                  <>
                    <p>
                      <strong>@{n.reportedUser?.username}</strong> kullanıcısı{" "}
                      <strong>@{n.reporterUsername}</strong> tarafından şikayet edildi.
                    </p>
                    <p className="text-muted-foreground">Sebep: {n.reason}</p>
                    {n.reportedUser?.disable && (
                      <p className="text-xs text-destructive">Bu kullanıcı zaten devre dışı.</p>
                    )}
                  </>
                ) : n.type === "book_data_error" ? (
                  <>
                    <p>
                      <Link href={`/kitap/${n.bookSlug}`} className="hover:underline">
                        <strong>{n.bookName}</strong>
                      </Link>{" "}
                      için <strong>@{n.reporterUsername}</strong> tarafından veri hatası bildirildi.
                    </p>
                    <p className="text-muted-foreground">{n.reason}</p>
                  </>
                ) : n.type === "auto_flag_comment" || n.type === "auto_flag_subcomment" ? (
                  <>
                    <p>
                      <strong>@{n.commentOwnerUsername}</strong> kullanıcısının yorumu otomatik
                      olarak bayraklandı ({n.type === "auto_flag_comment" ? "yorum" : "yanıt"}).
                    </p>
                    <p className="text-muted-foreground">{n.reason}</p>
                    <p className="text-muted-foreground">&ldquo;{n.commentText}&rdquo;</p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>@{n.commentOwnerUsername}</strong> kullanıcısının yorumu şikayet
                      edildi ({n.type === "comment" ? "yorum" : "yanıt"}).
                    </p>
                    <p className="text-muted-foreground">&ldquo;{n.commentText}&rdquo;</p>
                  </>
                )}
              </div>
              <NoticeActions noticeId={n.id} isResolved={n.isResolved} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/sikayetler?type=${type}&page=${p}`}
              className={`rounded-md px-2.5 py-1 ${
                p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
