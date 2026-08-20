import Link from "next/link";
import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";

// Isolated in its own Suspense boundary: auth() reads cookies(), which is
// genuinely per-request data - keeping it out of SiteHeader directly means the
// rest of the header (logo/nav/search/theme) still prerenders into the static
// shell instead of forcing every page that uses SiteHeader to go dynamic.
export function AuthStatus() {
  return (
    <Suspense fallback={<div className="h-8 w-20" />}>
      <AuthStatusContent />
    </Suspense>
  );
}

async function AuthStatusContent() {
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Button
          variant="ghost"
          className="hidden sm:inline-flex"
          render={<Link href="/giris" />}
        >
          Giriş Yap
        </Button>
        <Button render={<Link href="/kayit-ol" />}>Üye Ol</Button>
      </>
    );
  }

  const initials = (session.user.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/profil/${session.user.name}`}
        className="flex items-center gap-2"
      >
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl(session.user.image ?? null) ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">
          {session.user.name}
        </span>
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" size="sm" type="submit">
          Çıkış
        </Button>
      </form>
    </div>
  );
}
