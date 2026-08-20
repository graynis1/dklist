import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { FollowList } from "@/components/dklist/follow-list";
import { getProfileByUsername, getFollowingList } from "@/db/queries/profile";

export default function FollowingPage({ params }: PageProps<"/profil/[username]/takip-edilenler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <FollowingContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function FollowingContent({
  params,
}: {
  params: PageProps<"/profil/[username]/takip-edilenler">["params"];
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const following = await getFollowingList(profile.id);

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>
          <Link href={`/profil/${username}`} className="hover:underline">
            @{username}
          </Link>
        </SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Takip Edilenler</h1>
      </div>
      <FollowList items={following} emptyMessage="Henüz kimseyi takip etmiyor." />
    </>
  );
}
