import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // signIn() on success also throws (Next's redirect() convention, digest
    // "NEXT_REDIRECT...") - only AuthError means an actual failed login;
    // anything else must be re-thrown so that redirect actually happens.
    if (error instanceof AuthError) {
      redirect(`/giris?error=${error.type}`);
    }
    throw error;
  }
}

// searchParams (the ?error=... query string) is genuinely per-request data, so
// only this small piece is allowed to be dynamic/streamed - the header, card
// chrome, and form fields around it still prerender into the static shell.
async function LoginError({
  searchParams,
}: {
  searchParams: PageProps<"/giris">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="text-sm text-destructive">Kullanıcı adı veya şifre hatalı.</p>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/giris">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Giriş Yap</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
              <Input name="username" placeholder="Kullanıcı adı" required />
              <Input
                name="password"
                type="password"
                placeholder="Şifre"
                required
              />
              <Suspense fallback={null}>
                <LoginError searchParams={searchParams} />
              </Suspense>
              <Button type="submit" className="w-full">
                Giriş Yap
              </Button>
              <div className="flex justify-between text-sm text-muted-foreground">
                <Link href="/kayit-ol" className="hover:underline">
                  Üye ol
                </Link>
                <Link href="/sifremi-unuttum" className="hover:underline">
                  Şifremi unuttum
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
