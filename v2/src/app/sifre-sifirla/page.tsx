import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmPasswordResetAction } from "./actions";

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
  const { userId, devCode, newPassword, error } = await searchParams;

  if (typeof newPassword === "string") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          E-posta gönderimi henüz bağlanmadı - geliştirme modunda yeni
          şifreniz: <strong>{newPassword}</strong>
          <br />
          Bu şifreyi bir daha göremeyeceksiniz, giriş yaptıktan sonra
          değiştirmenizi öneririz.
        </p>
        <Button render={<Link href="/giris" />} className="w-full">
          Giriş Yap
        </Button>
      </div>
    );
  }

  return (
    <form action={confirmPasswordResetAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={typeof userId === "string" ? userId : ""} />
      {devCode && (
        <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          E-posta gönderimi henüz bağlanmadı - geliştirme modunda sıfırlama
          kodunuz: <strong>{devCode}</strong>
        </p>
      )}
      <Input name="code" placeholder="Sıfırlama kodu" required maxLength={5} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        Şifreyi Sıfırla
      </Button>
    </form>
  );
}
