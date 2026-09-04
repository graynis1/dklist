import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { Button } from "@/components/ui/button";
import { EntityComments } from "@/components/dklist/entity-comments";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { auth } from "@/auth";
import { getClubBySlug } from "@/db/queries/book-clubs";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { hasRole, USER_TYPES } from "@/lib/roles";
import {
  addCommentAction,
  addReplyAction,
  shareCommentAction,
  joinClubAction,
  leaveClubAction,
  searchBooksForClubAction,
  updateClubCurrentBookAction,
  updateClubDescriptionAction,
  deleteClubAction,
} from "./actions";
import { ClubJoinButton } from "@/components/dklist/club-join-button";
import { ClubManageBook } from "@/components/dklist/club-manage-book";
import { ClubManageDescription } from "@/components/dklist/club-manage-description";
import { ClubDeleteButton } from "@/components/dklist/club-delete-button";

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

  return pageMetadata({
    title: `${club.name} (Kitap Kulübü)`,
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
  const canManage = userId
    ? club.ownerId === userId || hasRole(session?.user?.userType, [USER_TYPES.Admin, USER_TYPES.Mod])
    : false;

  const comments = await getEntityComments(club.id, "bookClub");
  const commentIds = comments.map((c) => c.id);
  const [repliesByComment, commentLikes] = await Promise.all([
    getRepliesForComments(commentIds),
    getCommentLikeStates(userId, commentIds),
  ]);
  const repliesByCommentObj = Object.fromEntries(repliesByComment);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Kitap Kulübü</SectionLabel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{club.name}</h1>
          <ClubJoinButton
            clubId={club.id}
            slug={club.slug}
            isMember={isMember}
            isOwner={club.ownerId === userId}
            signedIn={Boolean(userId)}
            joinAction={joinClubAction}
            leaveAction={leaveClubAction}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {club.memberCount} üye {club.ownerUsername && <>· Kurucu: @{club.ownerUsername}</>}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{club.description}</p>
        {canManage && (
          <ClubManageDescription
            clubId={club.id}
            slug={club.slug}
            description={club.description}
            updateAction={updateClubDescriptionAction}
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

      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Üyeler ({club.memberCount})</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {club.members.map((m) => (
            <Link
              key={m.userId}
              href={`/profil/${m.username}`}
              className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
            >
              @{m.username}
              {m.role === "owner" && <span className="ml-1 text-xs text-muted-foreground">(kurucu)</span>}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">Tartışma</h2>
        {isMember ? (
          <EntityComments
            signedIn={Boolean(userId)}
            viewerId={userId ?? undefined}
            initialComments={comments}
            initialRepliesByComment={repliesByCommentObj}
            commentLikes={commentLikes}
            addCommentAction={addCommentAction.bind(null, club.id, "comment")}
            addReplyAction={addReplyAction}
            shareCommentAction={shareCommentAction}
            placeholder="Kulüpteki tartışmaya katıl…"
            submitLabel="Gönder"
            emptyMessage="Henüz mesaj yok - ilk mesajı sen yaz."
          />
        ) : (
          <p className="text-sm text-muted-foreground">Tartışmaya katılmak için önce kulübe üye olmalısın.</p>
        )}
      </section>

      {canManage && (
        <div className="mt-16 border-t border-border pt-6">
          <SectionLabel>Yönetim</SectionLabel>
          <div className="mt-2">
            <ClubDeleteButton clubId={club.id} deleteAction={deleteClubAction} />
          </div>
        </div>
      )}
    </div>
  );
}
