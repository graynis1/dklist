import Link from "next/link";
import { NewsletterForm } from "@/components/dklist/newsletter-form";

// v1's Footer.js - social links, legal-policy links, and the newsletter
// signup all ported here; v2 had no footer at all before this.
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-[100rem] gap-8 px-6 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <span className="font-heading text-xl font-medium tracking-tight">DKList</span>
          <p className="text-sm text-muted-foreground">Kitapseverlerin Buluşma Noktası</p>
          <p className="text-sm text-muted-foreground">info@dklist.com</p>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <a href="https://www.instagram.com/dklist/" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Instagram
            </a>
            <a href="https://www.facebook.com/dunyakitaplistesi/" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Facebook
            </a>
            <a href="https://www.youtube.com/channel/UC1Jh1-m3Lw7oQPG9ptSYAnA" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              YouTube
            </a>
            <a href="https://twitter.com/dklist2" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Twitter
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/site-kullanim-sartlari" className="hover:text-foreground hover:underline">
            Site Kullanım Şartları
          </Link>
          <Link href="/cerez-politikasi" className="hover:text-foreground hover:underline">
            Çerez Politikası
          </Link>
          <Link href="/gizlilik-politikasi" className="hover:text-foreground hover:underline">
            Gizlilik Politikası
          </Link>
          <Link href="/reklam-ver" className="hover:text-foreground hover:underline">
            Reklam Ver
          </Link>
          <Link href="/destek" className="hover:text-foreground hover:underline">
            Destek
          </Link>
          <a href="mailto:info@dklist.com" className="hover:text-foreground hover:underline">
            İletişim
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Haber Bültenine Üye Olun</h3>
          <p className="text-sm text-muted-foreground">
            Etkinliklerimizden ve haberlerimizden haberdar olmak için e-bültenimize kayıt olabilirsiniz.
          </p>
          <NewsletterForm />
        </div>
      </div>
    </footer>
  );
}
