import { Suspense } from "react";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerAction } from "./actions";

export default function RegisterPage({ searchParams }: PageProps<"/kayit-ol">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Üye Ol</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={registerAction} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="name" placeholder="İsim" required />
                <Input name="surname" placeholder="Soyisim" required />
              </div>
              <Input name="username" placeholder="Kullanıcı adı" required />
              <Input name="mail" type="email" placeholder="E-posta" required />
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="sex"
                  required
                  defaultValue=""
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="" disabled>
                    Cinsiyet
                  </option>
                  <option value="erkek">Erkek</option>
                  <option value="kadin">Kadın</option>
                  <option value="belirtmek-istemiyorum">Belirtmek istemiyorum</option>
                </select>
                <Input name="birthDate" type="date" required />
              </div>
              <Input name="password" type="password" placeholder="Şifre (en az 6 karakter)" required minLength={6} />
              <Suspense fallback={null}>
                <RegisterError searchParams={searchParams} />
              </Suspense>
              <Button type="submit" className="w-full">
                Üye Ol
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function RegisterError({
  searchParams,
}: {
  searchParams: PageProps<"/kayit-ol">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}
