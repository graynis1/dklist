import { Suspense } from "react";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage({ searchParams }: PageProps<"/sifremi-unuttum">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Şifremi Unuttum</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={requestPasswordResetAction} className="flex flex-col gap-4">
              <Input name="target" placeholder="Kullanıcı adı veya e-posta" required />
              <Suspense fallback={null}>
                <ForgotPasswordError searchParams={searchParams} />
              </Suspense>
              <Button type="submit" className="w-full">
                Sıfırlama Kodu Gönder
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function ForgotPasswordError({
  searchParams,
}: {
  searchParams: PageProps<"/sifremi-unuttum">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}
