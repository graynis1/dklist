import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

// Tek kullanımlık, token'a bağlı bir işlem sayfası - aranabilir bir
// değeri yok, hesap doğrulama linkleri arama sonuçlarında görünmemeli.
export const metadata: Metadata = NOINDEX_METADATA;
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyMailAction } from "./actions";

export default function VerifyMailPage({ searchParams }: PageProps<"/dogrula">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">E-postanı Doğrula</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <VerifyForm searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function VerifyForm({
  searchParams,
}: {
  searchParams: PageProps<"/dogrula">["searchParams"];
}) {
  const { userId, devCode, error } = await searchParams;

  return (
    <form action={verifyMailAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={typeof userId === "string" ? userId : ""} />
      {devCode ? (
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          E-posta gönderimi yapılandırılmamış - geliştirme modunda doğrulama
          kodunuz: <strong>{devCode}</strong>
        </p>
      ) : (
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          Doğrulama kodu e-posta adresinize gönderildi.
        </p>
      )}
      <Input name="code" placeholder="Doğrulama kodu" required maxLength={5} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        Doğrula
      </Button>
    </form>
  );
}
