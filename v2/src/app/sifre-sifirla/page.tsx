import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmPasswordResetAction } from "./actions";
import { ResendResetCodeButton } from "@/components/dklist/resend-reset-code-button";

export default function ResetPasswordPage({ searchParams }: PageProps<"/sifre-sifirla">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Şifre Sıfırlama</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <ResetForm searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function ResetForm({
  searchParams,
}: {
  searchParams: PageProps<"/sifre-sifirla">["searchParams"];
}) {
  const { userId, code, devCode, newPassword, error } = await searchParams;
  // `code` (initial request) and `devCode` (resend action) are the same
  // real code, just threaded through two different call sites.
  const shownCode = (typeof code === "string" ? code : undefined) ?? (typeof devCode === "string" ? devCode : undefined);

  if (typeof newPassword === "string") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          Yeni şifren e-postana da gönderildi, ama e-posta gecikebilir - hemen
          giriş yapmak istersen yeni şifren: <strong>{newPassword}</strong>
          <br />
          Giriş yaptıktan sonra profilinden dilediğin şifreyi belirleyebilirsin.
        </p>
        <Button render={<Link href="/giris" />} nativeButton={false} className="w-full">
          Giriş Yap
        </Button>
      </div>
    );
  }

  return (
    <form action={confirmPasswordResetAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={typeof userId === "string" ? userId : ""} />
      {shownCode ? (
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          Sıfırlama kodun e-postana da gönderildi, ama e-posta gecikebilir -
          hemen devam etmek istersen kodun: <strong>{shownCode}</strong>
        </p>
      ) : (
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          Sıfırlama kodu e-posta adresinize gönderildi.
        </p>
      )}
      <Input name="code" placeholder="Sıfırlama kodu" required maxLength={5} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        Şifreyi Sıfırla
      </Button>
      {Number.isFinite(Number(userId)) && <ResendResetCodeButton userId={Number(userId)} />}
    </form>
  );
}
