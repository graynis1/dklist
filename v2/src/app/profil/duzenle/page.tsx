import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/auth";
import { getEditableProfile } from "@/db/queries/profile";
import { avatarUrl } from "@/db/queries/avatar";
import { updateProfileAction } from "@/app/profil/[username]/actions";
import { TwoFactorToggle } from "@/components/dklist/two-factor-toggle";

export default function EditProfilePage({ searchParams }: PageProps<"/profil/duzenle">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-6 py-16">
        <Suspense fallback={<FormSkeleton />}>
          <EditProfileContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
}

async function EditProfileContent({
  searchParams,
}: {
  searchParams: PageProps<"/profil/duzenle">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const { error } = await searchParams;
  const profile = await getEditableProfile(Number(session.user.id));

  if (!profile) {
    redirect("/giris");
  }

  return (
    <div className="flex flex-col gap-6">
      <TwoFactorToggle initialEnabled={profile.twoFactorEnabled} />
      <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Profili Düzenle</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateProfileAction} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={avatarUrl(profile.image) ?? undefined} />
              <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <label htmlFor="avatar" className="text-sm text-muted-foreground">
                Profil fotoğrafı
              </label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="name" placeholder="İsim" defaultValue={profile.name} required />
            <Input name="surname" placeholder="Soyisim" defaultValue={profile.surname} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              name="sex"
              defaultValue={profile.sex}
              required
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Cinsiyet seçin</option>
              <option value="erkek">Erkek</option>
              <option value="kadin">Kadın</option>
              <option value="belirtmek-istemiyorum">Belirtmek istemiyorum</option>
            </select>
            <Input
              name="birthDate"
              type="date"
              defaultValue={profile.birthDate}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="birthPlace"
              placeholder="Doğum yeri"
              defaultValue={profile.birthPlace ?? ""}
            />
            <Input
              name="livingCity"
              placeholder="Yaşadığı şehir"
              defaultValue={profile.livingCity ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="edu" placeholder="Eğitim" defaultValue={profile.edu ?? ""} />
            <Input name="job" placeholder="Meslek" defaultValue={profile.job ?? ""} />
          </div>

          <textarea
            name="biyo"
            placeholder="Kısa biyografi"
            defaultValue={profile.biyo ?? ""}
            rows={3}
            maxLength={255}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />

          <Input
            name="password"
            type="password"
            placeholder="Yeni şifre (değiştirmek istemiyorsanız boş bırakın)"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-fit">
            Kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
