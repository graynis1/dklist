import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getVideoList } from "@/db/queries/videos";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateVideoForm } from "@/components/dklist/create-video-form";
import { VideoAdminRow } from "@/components/dklist/video-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminVideosPage({ searchParams }: PageProps<"/admin/videolar">) {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminVideosContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminVideosContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/videolar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getVideoList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader title="Videolar" description={`YouTube video listesini yönet - toplam ${total} kayıt.`} />

      <CreateVideoForm />

      <form action="/admin/videolar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Video başlığında ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan video yok." : "Henüz video yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((video) => (
            <VideoAdminRow key={video.id} video={video} />
          ))}
        </ul>
      )}

      <PaginationNav
        page={page}
        lastPage={lastPage}
        hrefForPage={(p) => `/admin/videolar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
      />
    </div>
  );
}
