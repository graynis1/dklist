import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { LoginForm } from "@/components/dklist/login-form";
import { AuthVisualPanel, AuthMobileTeaser } from "@/components/dklist/auth-visual-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Giriş Yap",
  description: "DKList hesabına giriş yap, okuma durumunu ve kitaplığını yönet.",
  path: "/giris",
});

const BOOKS: [
  { title: string; author: string; tone: "oxblood" },
  { title: string; author: string; tone: "dusk" },
  { title: string; author: string; tone: "ink" },
] = [
  { title: "Suç ve Ceza", author: "Fyodor Dostoyevski", tone: "oxblood" },
  { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali", tone: "dusk" },
  { title: "1984", author: "George Orwell", tone: "ink" },
];

export default function SignInPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="grid grid-cols-1 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <AuthVisualPanel
          eyebrow="Tekrar Hoş Geldin"
          title="Kaldığın sayfadan devam et."
          description="Okuduğun kitapları takip et, puanla, yorumla ve okuma arkadaşlarınla paylaş - DKList seni bekliyordu."
          books={BOOKS}
        />

        <div className="flex flex-col items-center justify-center px-6 py-16">
          <AuthMobileTeaser books={BOOKS} />
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-medium tracking-tight">Giriş Yap</h1>
              <p className="text-sm text-muted-foreground">Rafına dönmek için hesabına giriş yap.</p>
            </div>
            <LoginForm />
            <div className="flex justify-between text-sm text-muted-foreground">
              <Link href="/kayit-ol" className="font-medium text-primary hover:underline">
                Hesabın yok mu? Üye ol
              </Link>
              <Link href="/sifremi-unuttum" className="hover:underline">
                Şifremi unuttum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
