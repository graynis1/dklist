import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { FollowList } from "@/components/dklist/follow-list";
import { getProfileByUsername, getFollowingList } from "@/db/queries/profile";
import { ProfileLink } from "@/components/dklist/profile-link";
import { safeDecodeURIComponent } from "@/lib/utils";

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
  const { username: rawUsername } = await params;
  const username = safeDecodeURIComponent(rawUsername);
  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const following = await getFollowingList(profile.id);

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>
          <ProfileLink username={username} className="hover:underline">
            @{username}
          </ProfileLink>
        </SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Takip Edilenler</h1>
      </div>
      <FollowList items={following} emptyMessage="Henüz kimseyi takip etmiyor." />
    </>
  );
}
