import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { getMyPublisherApplication } from "@/db/queries/yazarhane";
import { PublisherApplicationForm } from "./form";

export const metadata = { title: "Yayınevi Başvurusu | DKList" };

export default function PublisherApplicationPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yayınevi üyeliği</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Yayınevi hesabıyla kitaplarınızı kataloğa ekler, yayınevi sayfanızı yönetirsiniz. Başvurunuz ekibimizce incelenir.
        </p>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <p className="text-sm">
        Başvurmak için <Link href="/giris" className="font-medium text-primary hover:underline">giriş yapın</Link>.
      </p>
    );
  }
  if (session.user.userType === "Yayinevi") {
    return <p className="rounded-lg bg-primary/10 p-4 text-sm">Yayınevi hesabınız aktif. <Link href="/kitap/yeni" className="font-medium text-primary hover:underline">Kitap ekleyin</Link>.</p>;
  }
  const app = await getMyPublisherApplication(Number(session.user.id));
  if (app?.status === "pending") return <p className="rounded-lg bg-primary/10 p-4 text-sm">Başvurunuz inceleniyor. Sonuçlandığında bildirim alacaksınız.</p>;
  return <PublisherApplicationForm rejectedNote={app?.status === "rejected" ? app.reviewerNote : undefined} />;
}
