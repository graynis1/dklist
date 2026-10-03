import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { auth } from "@/auth";
import { getClubBySlug, hasPendingClubJoinRequest, canManageClub } from "@/db/queries/book-clubs";
import { getClubPosts } from "@/db/queries/club-posts";
import { hasRole, USER_TYPES } from "@/lib/roles";
import { clubImageUrl, feedPostImageUrl } from "@/lib/image-urls";
import { ClubLogo, clubDisplayName, clubGradient } from "@/components/dklist/club-logo";
import { ClubPosts } from "@/components/dklist/club-posts";
import { ClubBrandingForm } from "@/components/dklist/club-branding-form";
import {
  joinClubAction,
  leaveClubAction,
  removeClubMemberAction,
  searchBooksForClubAction,
  updateClubCurrentBookAction,
  updateClubDescriptionAction,
  updateClubNameAction,
  deleteClubAction,
  getClubJoinRequestsAction,
  approveClubJoinRequestAction,
  rejectClubJoinRequestAction,
  setClubRequiresApprovalAction,
  createClubPostAction,
  deleteClubPostAction,
  setClubMemberRoleAction,
  updateClubBrandingAction,
} from "./actions";
import { ClubJoinButton } from "@/components/dklist/club-join-button";
import { ClubMemberList } from "@/components/dklist/club-member-list";
import { ClubManageBook } from "@/components/dklist/club-manage-book";
import { ClubManageDetails } from "@/components/dklist/club-manage-description";
import { ClubDeleteButton } from "@/components/dklist/club-delete-button";
import { ShareButton } from "@/components/dklist/share-button";
import { ClubJoinRequestsPanel } from "@/components/dklist/club-join-requests-panel";
import { ClubApprovalToggle } from "@/components/dklist/club-approval-toggle";

export async function generateMetadata({ params, searchParams }: PageProps<"/kulup/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return {};

  // Real bug found via customer report: sharing a club comment on
  // Facebook showed only this page's generic title/description, no
  // trace of the actual comment - see share-button.tsx's `quote` prop.
  // When present, use the real quoted text as the description instead.
  const { alinti } = await searchParams;
  const quote = typeof alinti === "string" ? alinti : undefined;

  // Same title fix as kitap/[slug] - a quote/comment share should lead
  // with the quote, not just swap the description underneath it.
  const title = quote
    ? `"${quote.length > 80 ? `${quote.slice(0, 80)}...` : quote}" - ${club.name}`
    : `${club.name} (Kitap Kulübü)`;
  return pageMetadata({
    title,
    description: truncateDescription(
      quote ? `"${quote}" - ${club.name} kitap kulübünde paylaşıldı.` : club.description || `${club.name} kitap kulübüne DKList'te katıl.`,
    ),
    path: `/kulup/${club.slug}`,
    noIndex: club.visibility !== "public",
  });
}

export default function BookClubDetailPage({ params }: PageProps<"/kulup/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-16"><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>}>
        <ClubDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function ClubDetailContent({ params }: { params: PageProps<"/kulup/[slug]">["params"] }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isMember = userId ? club.members.some((m) => m.userId === userId) : false;
  const canManage = userId ? await canManageClub(club.id, userId, session?.user?.userType ?? "") : false;
  const isOwnerViewer = userId ? club.ownerId === userId || hasRole(session?.user?.userType, [USER_TYPES.Admin, USER_TYPES.Mod]) : false;
  const isPendingRequest = userId && !isMember && club.requiresApproval ? await hasPendingClubJoinRequest(club.id, userId) : false;

  const postPage = await getClubPosts(club.id, userId, 30);
  const posts = postPage.items.map((p) => ({ ...p, image: p.image ? feedPostImageUrl(p.image) : null }));
  const logo = club.image ? clubImageUrl(club.image) : null;
  const [hueA, hueB] = clubGradient(club.name, club.color);
  const official = /^dklist\s*\|/i.test(club.name);
  const me = userId ? { id: userId, username: session?.user?.name ?? "", image: session?.user?.image ?? null } : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16 sm:px-6 lg:pb-20">
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-28 sm:h-36" style={{ background: `linear-gradient(135deg, ${hueA}, ${hueB})` }} />
        <div className="flex flex-col gap-3 px-5 pb-5">
          <div className="-mt-10 w-fit rounded-[22px] bg-card p-1">
            <ClubLogo name={club.name} image={logo} color={club.color} size={84} />
          </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-medium tracking-tight">{clubDisplayName(club.name)}</h1>
            {official && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Resmi DKList kulübü</span>}
            {/* Real customer report: "kulübün gizli yada genele açık
                olduğu yazmalı sanırım girince gruplarından hangisi nasıldı
                belli olmuyor" - visibility already existed in the schema
                (it just controls /kulupler listing, see book-clubs.ts) but
                was never actually shown anywhere on the page itself. */}
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {club.visibility === "private" ? "Gizli" : "Herkese Açık"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton content={`${club.name} kitap kulübüne katıl!`} url={`/kulup/${club.slug}`} />
            <ClubJoinButton
              clubId={club.id}
              slug={club.slug}
              isMember={isMember}
              isOwner={club.ownerId === userId}
              isPendingRequest={isPendingRequest}
              signedIn={Boolean(userId)}
              joinAction={joinClubAction}
              leaveAction={leaveClubAction}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {club.memberCount} üye {club.ownerUsername && <>· Kurucu: @{club.ownerUsername}</>}
        </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{club.description}</p>
        {canManage && (
          <ClubManageDetails
            clubId={club.id}
            slug={club.slug}
            name={club.name}
            description={club.description}
            updateNameAction={updateClubNameAction}
            updateDescriptionAction={updateClubDescriptionAction}
          />
        )}
      </div>

      <div className="mb-10 rounded-lg border border-border p-4">
        <SectionLabel>Şu An Okunan Kitap</SectionLabel>
        {club.currentBookName ? (
          // Real gap found via customer report: this was text-only ("daha
          // görsel bir hava katmazmıydı?") - now shows the real cover
          // next to the name/author, same as everywhere else on the site.
          <Link href={`/kitap/${club.currentBookSlug}`} className="mt-2 flex items-center gap-3 hover:underline">
            <BookCover
              title={club.currentBookName}
              author={club.currentBookWriters.join(", ") || "Yazar bilinmiyor"}
              tone={toneForId(club.currentBookId!)}
              bookId={club.currentBookId!}
              hasImage={club.currentBookHasImage}
              size="sm"
              className="w-12 shrink-0"
            />
            <span className="font-medium">
              {club.currentBookName}
              {club.currentBookWriters.length > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">— {club.currentBookWriters.join(", ")}</span>
              )}
            </span>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Henüz belirlenmedi.</p>
        )}
        {canManage && (
          <ClubManageBook
            clubId={club.id}
            slug={club.slug}
            searchAction={searchBooksForClubAction}
            updateAction={updateClubCurrentBookAction}
          />
        )}
      </div>

      {canManage && (
        <div className="mb-6 flex flex-col gap-3">
          <ClubApprovalToggle clubId={club.id} slug={club.slug} initialRequiresApproval={club.requiresApproval} action={setClubRequiresApprovalAction} />
          {club.requiresApproval && (
            <ClubJoinRequestsPanel
              clubId={club.id}
              slug={club.slug}
              loadAction={getClubJoinRequestsAction}
              approveAction={approveClubJoinRequestAction}
              rejectAction={rejectClubJoinRequestAction}
            />
          )}
        </div>
      )}

      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Üyeler ({club.memberCount})</SectionLabel>
        <ClubMemberList
          clubId={club.id}
          slug={club.slug}
          members={club.members}
          canManage={canManage}
          isOwnerViewer={isOwnerViewer}
          removeAction={removeClubMemberAction}
          roleAction={setClubMemberRoleAction}
        />
        {isOwnerViewer && <p className="text-xs text-muted-foreground">Kalkan simgesiyle bir üyeyi kulüp yöneticisi yapabilirsin; yöneticiler kulübü senin gibi yönetebilir.</p>}
      </div>

      <section className="mt-12">
        <h2 className="font-heading mb-5 text-2xl font-medium tracking-tight">Paylaşımlar</h2>
        <ClubPosts
          clubId={club.id}
          slug={club.slug}
          posts={posts}
          viewerId={userId}
          canPost={isMember}
          canManage={canManage}
          me={me}
          createAction={createClubPostAction}
          deleteAction={deleteClubPostAction}
        />
      </section>

      {canManage && (
        <div className="mt-16 border-t border-border pt-6">
          <SectionLabel>Yönetim</SectionLabel>
          <div className="mt-3 mb-6">
            <ClubBrandingForm clubId={club.id} slug={club.slug} name={club.name} image={logo} color={club.color} action={updateClubBrandingAction} />
          </div>
          <div className="mt-2">
            <ClubDeleteButton clubId={club.id} deleteAction={deleteClubAction} />
          </div>
        </div>
      )}
    </div>
  );
}
