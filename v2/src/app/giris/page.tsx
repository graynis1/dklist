import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/dklist/login-form";

export default function SignInPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Giriş Yap</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <Link href="/kayit-ol" className="hover:underline">
                Üye ol
              </Link>
              <Link href="/sifremi-unuttum" className="hover:underline">
                Şifremi unuttum
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
