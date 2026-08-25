import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Üye Ol",
  description: "Bir dakikada DKList hesabını oluştur, okumaya başla.",
  path: "/kayit-ol",
});
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthVisualPanel, AuthMobileTeaser } from "@/components/dklist/auth-visual-panel";
import { SEX_OPTIONS } from "@/lib/sex";
import { registerAction } from "./actions";

const BOOKS: [
  { title: string; author: string; tone: "ochre" },
  { title: string; author: string; tone: "sage" },
  { title: string; author: string; tone: "plum" },
] = [
  { title: "Simyacı", author: "Paulo Coelho", tone: "ochre" },
  { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", tone: "sage" },
  { title: "İnsanın Anlam Arayışı", author: "Viktor E. Frankl", tone: "plum" },
];

export default function RegisterPage({ searchParams }: PageProps<"/kayit-ol">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="grid grid-cols-1 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <AuthVisualPanel
          eyebrow="Aramıza Katıl"
          title="Bir sonraki favori kitabını burada bulacaksın."
          description="Okuduklarını değerlendir, yeni kitaplar keşfet, aynı rafı paylaştığın okurlarla tanış."
          books={BOOKS}
          stat={{ value: "98M+", label: "Katalogdaki Kitap" }}
        />

        <div className="flex flex-col items-center justify-center px-6 py-16">
          <AuthMobileTeaser books={BOOKS} />
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-medium tracking-tight">Üye Ol</h1>
              <p className="text-sm text-muted-foreground">Bir dakikada hesabını oluştur, okumaya başla.</p>
            </div>
            <form action={registerAction} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="name" placeholder="İsim" required />
                <Input name="surname" placeholder="Soyisim" required />
              </div>
              <Input name="username" placeholder="Kullanıcı adı" required />
              <Input name="mail" type="email" placeholder="E-posta" required />
              <div className="grid grid-cols-2 gap-4">
                <Select name="sex" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Cinsiyet" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <p className="text-sm text-muted-foreground">
              Zaten üye misin?{" "}
              <Link href="/giris" className="font-medium text-primary hover:underline">
                Giriş yap
              </Link>
            </p>
          </div>
        </div>
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
