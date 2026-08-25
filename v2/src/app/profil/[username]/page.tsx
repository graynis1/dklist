import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import {
  UsersIcon,
  UserPlusIcon,
  TrophyIcon,
  ClockIcon,
  FlameIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  BookmarkIcon,
  XCircleIcon,
  LibraryIcon,
  HeartIcon,
  Building2Icon,
  NewspaperIcon,
  TargetIcon,
  MessageCircleIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/dklist/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { BookCover, toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { avatarUrl } from "@/db/queries/avatar";
import { FollowButton } from "@/components/dklist/follow-button";
import { ReportUserButton } from "@/components/dklist/report-user-button";
import { BlockUserButton } from "@/components/dklist/block-user-button";
import { isBlockedByMe } from "@/db/queries/blocks";
import { ReadingGoalControl } from "@/components/dklist/reading-goal-control";
import { ReadingScoreCard } from "@/components/dklist/reading-score-card";
import { PointsShareCard } from "@/components/dklist/points-share-card";
import { VerifiedToggleButton } from "@/components/dklist/verified-toggle-button";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getBooksByStatus,
  getLibraryBooks,
  getCurrentReadingGoal,
  getPastReadingGoals,
  getReadingScoreStats,
  getUserBadges,
  getSharedReadBooks,
} from "@/db/queries/profile";
import { getLikedWriters, getLikedTranslators, getLikedPublishers } from "@/db/queries/likes";
import { getUserTotalPoints, isRecentlyActive, getUserActivityHeatmap, getUserActivityStreak, getUserWeeklyRank } from "@/db/queries/points";
import { ActivityHeatmap } from "@/components/dklist/activity-heatmap";
import { getBlogsByOwner } from "@/db/queries/blog";
import { READ_STATUSES } from "@/lib/reading-status";
import { getTotalReadingMinutes } from "@/db/queries/reading-status";
import { isUserPremium } from "@/db/queries/premium";

const STATUS_LABELS: Record<(typeof READ_STATUSES)[number], string> = {
  finishRead: "Okudum",
  currentRead: "Okuyorum",
  targetRead: "Okuyacağım",
  "dropRead": "Yarıda Bıraktım",
};

const STATUS_ICONS: Record<(typeof READ_STATUSES)[number], typeof BookOpenIcon> = {
  finishRead: CheckCircle2Icon,
  currentRead: BookOpenIcon,
  targetRead: BookmarkIcon,
  "dropRead": XCircleIcon,
};

const SECTION_TINTS = {
  primary: "bg-primary/10 text-primary",
  rose: "bg-rose-500/10 text-rose-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  blue: "bg-blue-500/10 text-blue-500",
  violet: "bg-violet-500/10 text-violet-500",
  amber: "bg-amber-500/10 text-amber-600",
  teal: "bg-teal-500/10 text-teal-600",
  indigo: "bg-indigo-500/10 text-indigo-500",
} as const;

/** Kartların artık her biri aynı düz bg-card kutusu değil - başlıktaki
 * ikon rengiyle eşleşen, çok hafif bir zemin tonu taşıyor. Sayfaya
 * uzaktan bakınca bile bölümler arasında görsel fark seçilsin diye.
 * Inline style olarak uygulanıyor (className olarak bg-card ile aynı
 * anda verilseydi ikisi de background-color'ı hedeflediği için hangisinin
 * kazanacağı Tailwind'in derleme sırasına kalırdı - inline style her
 * zaman kazanır, belirsizlik kalmaz). */
const SECTION_WASHES: Record<keyof typeof SECTION_TINTS, string> = {
  primary: "color-mix(in oklch, var(--primary) 5%, var(--card))",
  rose: "color-mix(in oklch, var(--color-rose-500) 5%, var(--card))",
  emerald: "color-mix(in oklch, var(--color-emerald-500) 5%, var(--card))",
  blue: "color-mix(in oklch, var(--color-blue-500) 5%, var(--card))",
  violet: "color-mix(in oklch, var(--color-violet-500) 5%, var(--card))",
  amber: "color-mix(in oklch, var(--color-amber-500) 6%, var(--card))",
  teal: "color-mix(in oklch, var(--color-teal-500) 5%, var(--card))",
  indigo: "color-mix(in oklch, var(--color-indigo-500) 5%, var(--card))",
};

const STATUS_TINTS: Record<(typeof READ_STATUSES)[number], keyof typeof SECTION_TINTS> = {
  finishRead: "emerald",
  currentRead: "blue",
  targetRead: "violet",
  "dropRead": "rose",
};

export async function generateMetadata({ params }: PageProps<"/profil/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return {};

  return pageMetadata({
    title: `@${profile.username}`,
    description: truncateDescription(profile.biyo || `@${profile.username} DKList'te - okuma durumu, kitaplığı ve etkinliği.`),
    path: `/profil/${profile.username}`,
    // Gizli hesaplar arama motorunda hiç görünmesin - okuma geçmişi/
    // kitaplığı zaten sadece takipçilere açık, ama profil sayfasının
    // kendisi de aranabilir kalmamalı.
    noIndex: profile.privacy,
  });
}

export default function ProfilePage({ params }: PageProps<"/profil/[username]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} />
      </Suspense>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

async function ProfileContent({
  params,
}: {
  params: PageProps<"/profil/[username]">["params"];
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwnProfile = viewerId === profile.id;
  const viewerIsAdmin = hasRole(session?.user?.userType, [USER_TYPES.Admin]);

  const [
    counts,
    viewerFollows,
    booksByStatus,
    libraryBooks,
    readingGoal,
    pastGoals,
    likedWriters,
    likedTranslators,
    likedPublishers,
    userBadges,
    totalPoints,
    ownerBlogs,
    veteranTier,
    sharedReadBooks,
    readingScoreStats,
    totalReadingMinutes,
    isPremium,
    activityHeatmap,
    viewerHasBlocked,
    activityStreak,
    weeklyRank,
  ] = await Promise.all([
    getFollowCounts(profile.id),
    viewerId && !isOwnProfile ? isFollowing(viewerId, profile.id) : Promise.resolve(false),
    getBooksByStatus(profile.id),
    getLibraryBooks(profile.id),
    getCurrentReadingGoal(profile.id),
    getPastReadingGoals(profile.id),
    getLikedWriters(profile.id),
    getLikedTranslators(profile.id),
    getLikedPublishers(profile.id),
    getUserBadges(profile.id),
    getUserTotalPoints(profile.id),
    getBlogsByOwner(profile.id, isOwnProfile),
    isRecentlyActive(profile.id),
    viewerId && !isOwnProfile ? getSharedReadBooks(viewerId, profile.id) : Promise.resolve([]),
    isOwnProfile ? getReadingScoreStats(profile.id, String(new Date().getFullYear())) : Promise.resolve(null),
    getTotalReadingMinutes(profile.id),
    isUserPremium(profile.id),
    getUserActivityHeatmap(profile.id),
    viewerId && !isOwnProfile ? isBlockedByMe(viewerId, profile.id) : Promise.resolve(false),
    getUserActivityStreak(profile.id),
    isOwnProfile ? getUserWeeklyRank(profile.id) : Promise.resolve(null),
  ]);

  const initials = profile.username.slice(0, 2).toUpperCase();
  // Gizlilik ayarı (real behavior on the pre-existing user.privacy column) -
  // owner and existing followers always see everything; a private profile
  // hides activity/reading-status/library/badges from anyone else, same
  // as the header's own follower/following counts staying visible either
  // way (Instagram-style: basic profile info is never hidden, only content).
  const canSeeDetails = isOwnProfile || viewerFollows || !profile.privacy;

  const tone = TONE_STYLE[toneForId(profile.id)];
  // Sadece gerçek bir okuma etkinliğinden (okuyor/okudu) geliyorsa öne
  // çıkar - kitaplığım'a düşerse aşağıdaki Kitaplığım rafıyla birebir
  // aynı tek kitabı iki kez göstermiş oluyorduk (gerçek bir tekrar hatası,
  // "aynı kitap iki kez" ekran görüntüsüyle bulundu).
  const featuredBook = booksByStatus.currentRead[0] ?? booksByStatus.finishRead[0] ?? null;
  const featuredLabel = booksByStatus.currentRead[0] ? "Şu An Okuyor" : "Son Okuduğu";

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 sm:py-16">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[300px_1fr]">
        {/* ---- Sol: profil kartı (Bionluk tarzı sabit kimlik kartı) ---- */}
        <aside className="flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:sticky lg:top-24">
          <div
            className="relative h-32 overflow-hidden"
            style={{
              background: `radial-gradient(120% 140% at 15% -10%, color-mix(in oklch, var(--primary), white 15%) 0%, ${tone.bg} 45%, color-mix(in oklch, ${tone.bg}, black 40%) 100%)`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
            <div
              className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full opacity-40 blur-2xl"
              style={{ backgroundColor: "var(--primary)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full opacity-30 blur-2xl"
              style={{ backgroundColor: tone.rule }}
            />
            {/* Marka kimliğine gönderme - sitenin diğer yerlerindeki serif
                başlık dilini banner'a da taşıyan dekoratif tırnak işareti. */}
            <span
              className="pointer-events-none absolute right-4 bottom-1 font-heading text-7xl leading-none italic opacity-15 select-none"
              style={{ color: tone.fg }}
              aria-hidden
            >
              &rdquo;
            </span>
          </div>

          <div className="-mt-14 flex flex-col items-center gap-2.5 px-5 text-center">
            <Avatar
              className="size-24 text-2xl ring-4 ring-card"
              style={{
                backgroundColor: tone.bg,
                color: tone.fg,
                boxShadow: profile.profileFrame ? `0 0 0 3px ${profile.profileFrame}` : undefined,
              }}
            >
              <AvatarImage src={avatarUrl(profile.image) ?? undefined} />
              <AvatarFallback style={{ backgroundColor: tone.bg, color: tone.fg }}>{initials}</AvatarFallback>
            </Avatar>
            <h1 className="flex items-center gap-1 font-heading text-2xl font-medium tracking-tight">
              @{profile.username}
              {profile.verified && (
                <span
                  title="Doğrulanmış resmi profil"
                  className="inline-flex size-4 items-center justify-center rounded-full bg-blue-500 text-[0.6rem] text-white"
                >
                  ✓
                </span>
              )}
            </h1>

            {(userBadges.length > 0 || veteranTier || isPremium) && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {isPremium && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-medium text-white">
                    ★ Premium
                  </span>
                )}
                {veteranTier && (
                  <span
                    title="Son 30 gün içindeki etkinliğe göre - düşen etkinlikle kaybolabilir"
                    className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    🔥 Emekter
                  </span>
                )}
                {userBadges.map((b) => (
                  <span
                    key={b.id}
                    title={b.comment}
                    className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {b.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/badge-image/${b.img}`} alt="" className="size-3.5 rounded-full object-cover" />
                    ) : (
                      "🏅"
                    )}{" "}
                    {b.name}
                  </span>
                ))}
              </div>
            )}

            <Link
              href="/puan-tablosu"
              className="mt-1 flex flex-col items-center rounded-2xl bg-gradient-to-b from-amber-400/15 to-transparent px-6 py-2.5 transition-colors hover:from-amber-400/25"
            >
              <span className="flex items-center gap-1.5 font-heading text-2xl font-semibold text-amber-500">
                <TrophyIcon className="size-5" />
                {totalPoints}
              </span>
              <span className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">Puan</span>
            </Link>

            <div className="mt-1 flex w-full flex-col gap-2">
              {viewerId && !isOwnProfile && (
                <>
                  <Link
                    href={`/mesajlar?user=${profile.username}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <MessageCircleIcon className="size-4" />
                    Mesaj Yaz
                  </Link>
                  <FollowButton targetUserId={profile.id} initialFollowing={viewerFollows} className="w-full rounded-xl" />
                </>
              )}
              {isOwnProfile && (
                <Link
                  href="/profil/duzenle"
                  className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Profili Düzenle
                </Link>
              )}
            </div>

            {viewerId && !isOwnProfile && (
              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                <ReportUserButton targetUserId={profile.id} />
                <BlockUserButton targetUserId={profile.id} initialBlocked={viewerHasBlocked} />
                {viewerIsAdmin && (
                  <VerifiedToggleButton targetUserId={profile.id} initialVerified={profile.verified} />
                )}
              </div>
            )}
          </div>

          {profile.biyo && (
            <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              {profile.biyo}
            </p>
          )}

          <div className="flex flex-col divide-y divide-border border-t border-border text-sm">
            <SidebarStatRow
              icon={UsersIcon}
              label="Takipçi"
              value={counts.followers}
              href={`/profil/${profile.username}/takipciler`}
            />
            <SidebarStatRow
              icon={UserPlusIcon}
              label="Takip"
              value={counts.following}
              href={`/profil/${profile.username}/takip-edilenler`}
            />
            {totalReadingMinutes > 0 && (
              <SidebarStatRow
                icon={ClockIcon}
                label="Okuma Süresi"
                value={`${Math.floor(totalReadingMinutes / 60)}s ${totalReadingMinutes % 60}d`}
              />
            )}
            {activityStreak > 0 && (
              <SidebarStatRow icon={FlameIcon} label="Aktiflik Serisi" value={`${activityStreak} gün`} accent />
            )}
          </div>

          {isOwnProfile && (
            <div className="flex flex-col divide-y divide-border border-t border-border text-sm">
              <SidebarLinkRow href="/ilanlarim" label="İlanlarım" />
              <SidebarLinkRow href="/favorilerim" label="Favorilerim" />
              <SidebarLinkRow href="/ice-aktar" label="Goodreads'ten İçe Aktar" />
            </div>
          )}
        </aside>

        {/* ---- Sağ: içerik ---- */}
        <div className="flex flex-col gap-6">
          {!canSeeDetails ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-4 py-12 text-center shadow-sm">
              <LockIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Bu hesap gizli. Okuma durumunu, kitaplığını ve etkinliğini görmek için takip et.
              </p>
            </div>
          ) : (
            <>
              {featuredBook && (
                <div
                  className="relative flex items-center gap-5 overflow-hidden rounded-3xl border border-border p-5 shadow-sm sm:p-6"
                  style={{
                    background: `linear-gradient(120deg, color-mix(in oklch, ${TONE_STYLE[toneForId(featuredBook.id)].bg}, transparent 88%) 0%, transparent 65%)`,
                  }}
                >
                  <BookCover
                    title={featuredBook.name}
                    author={featuredBook.writers.join(", ") || "Yazar bilinmiyor"}
                    tone={toneForId(featuredBook.id)}
                    bookId={featuredBook.id}
                    hasImage={featuredBook.hasImage}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-[0.2em] text-primary uppercase">{featuredLabel}</span>
                    <Link href={`/kitap/${featuredBook.slug}`} className="font-heading text-xl leading-snug font-medium hover:underline">
                      {featuredBook.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{featuredBook.writers.join(", ") || "Yazar bilinmiyor"}</p>
                    <Link
                      href={`/kitap/${featuredBook.slug}`}
                      className="mt-1.5 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Kitaba Git →
                    </Link>
                  </div>
                </div>
              )}

              {sharedReadBooks.length > 0 && (
                <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  İkinizin de okuduğu {sharedReadBooks.length === 1 ? "kitap" : `${sharedReadBooks.length} kitap`}:{" "}
                  {sharedReadBooks.map((b, i) => (
                    <span key={b.id}>
                      <Link href={`/kitap/${b.slug}`} className="font-medium text-foreground hover:underline">
                        {b.name}
                      </Link>
                      {i < sharedReadBooks.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}

              {/* Aktivite verisi yoksa 2. sütun boş kalıp yanında ölü bir
                  boşluk bırakıyordu (gerçek bir "yetim hücre" hatası) -
                  yalnızca ikisi de doluyken yan yana diz. */}
              <div className={activityHeatmap.length > 0 ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-2" : "flex flex-col gap-6"}>
                {activityHeatmap.length > 0 && (
                  <SectionCard title="Aktivite" icon={FlameIcon} tint="rose">
                    <ActivityHeatmap days={activityHeatmap} />
                  </SectionCard>
                )}

                <SectionCard title="2026 Okuma Hedefi" icon={TargetIcon}>
                  <div className="flex flex-col gap-3">
                    <ReadingGoalControl isOwnProfile={isOwnProfile} initialGoal={readingGoal} />
                    {pastGoals.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Geçmiş yıllar:{" "}
                        {pastGoals.map((g) => `${g.year}: ${g.readCount}/${g.targetCount}`).join(", ")}
                      </p>
                    )}
                    {isOwnProfile && readingScoreStats && (readingScoreStats.booksRead > 0 || readingScoreStats.totalMinutes > 0) && (
                      <ReadingScoreCard username={profile.username} stats={readingScoreStats} />
                    )}
                    {isOwnProfile && totalPoints > 0 && (
                      <PointsShareCard
                        username={profile.username}
                        stats={{
                          totalPoints,
                          weeklyPoints: weeklyRank?.points ?? 0,
                          weeklyRank: weeklyRank?.rank ?? null,
                          streakDays: activityStreak,
                        }}
                      />
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* items-start şart: aksi halde grid her satırdaki en uzun
                  kartın yüksekliğine göre kısa kartları da gereksiz yere
                  uzatıyor (daha önce yaşanan gerçek bug). Raflar artık
                  kaydırma değil sarma (flex-wrap) kullandığı için - hiçbir
                  öğe kırpılmadan - iki sütuna bölmek güvenli. */}
              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                {READ_STATUSES.every((s) => booksByStatus[s].length === 0) && libraryBooks.length === 0 && (
                  <SectionCard title="Kütüphane" icon={LibraryIcon}>
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <SparklesIcon className="size-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isOwnProfile
                          ? "Henüz bir kitaba okuma durumu eklemedin - ilk kitabını ekleyerek başla!"
                          : "Henüz bir kitaba okuma durumu eklenmemiş."}
                      </p>
                    </div>
                  </SectionCard>
                )}

                {READ_STATUSES.map((status) => {
                  const books = booksByStatus[status];
                  if (books.length === 0) return null;
                  return (
                    <SectionCard key={status} title={STATUS_LABELS[status]} icon={STATUS_ICONS[status]} count={books.length} tint={STATUS_TINTS[status]}>
                      <BookShelf books={books} />
                    </SectionCard>
                  );
                })}

                {libraryBooks.length > 0 && (
                  // Deliberately its own section, not merged into the reading-status
                  // groups above - ownership (kitaplığım) and reading status are
                  // independent facts per the customer's explicit ask.
                  <SectionCard title="Kitaplığım" icon={LibraryIcon} count={libraryBooks.length} tint="amber">
                    <BookShelf books={libraryBooks} />
                  </SectionCard>
                )}

                {likedWriters.length > 0 && (
                  <SectionCard title="Beğenilen Yazarlar" icon={HeartIcon} count={likedWriters.length} tint="rose">
                    <EntityChipShelf items={likedWriters} hrefPrefix="/yazar" />
                  </SectionCard>
                )}

                {likedTranslators.length > 0 && (
                  <SectionCard title="Beğenilen Çevirmenler" icon={HeartIcon} count={likedTranslators.length} tint="violet">
                    <EntityChipShelf items={likedTranslators} hrefPrefix="/cevirmen" />
                  </SectionCard>
                )}

                {likedPublishers.length > 0 && (
                  <SectionCard title="Takip Edilen Yayınevleri" icon={Building2Icon} count={likedPublishers.length} tint="teal">
                    <EntityChipShelf items={likedPublishers} hrefPrefix="/yayinevi" />
                  </SectionCard>
                )}
              </div>

              {ownerBlogs.length > 0 && (
                <SectionCard title="Blog Yazıları" icon={NewspaperIcon} count={ownerBlogs.length} tint="indigo">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ownerBlogs.map((b) => {
                      const t = TONE_STYLE[toneForId(b.id)];
                      return (
                        <Link
                          key={b.id}
                          href={`/blog/${b.slug}`}
                          className="group flex overflow-hidden rounded-lg border border-border transition-colors hover:border-foreground/20 hover:bg-accent"
                        >
                          <div className="w-1.5 shrink-0" style={{ backgroundColor: t.bg }} />
                          <div className="flex flex-1 flex-col justify-center gap-1 px-3 py-2.5">
                            <p className="text-sm font-medium leading-snug">{b.title}</p>
                            {!b.approved && (
                              <span className="w-fit rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium text-secondary-foreground">
                                Onay bekliyor
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarStatRow({
  icon: Icon,
  label,
  value,
  href,
  accent = false,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number | string;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div className="flex items-center justify-between gap-2 px-5 py-2.5 transition-colors hover:bg-accent">
      <span className="flex items-center gap-2.5 text-muted-foreground">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${accent ? "bg-orange-500/15 text-orange-500" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="size-3.5" />
        </span>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SidebarLinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="px-5 py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      {label}
    </Link>
  );
}

function SectionCard({
  title,
  icon: Icon,
  count,
  tint = "primary",
  children,
}: {
  title: string;
  icon: typeof UsersIcon;
  count?: number;
  tint?: keyof typeof SECTION_TINTS;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-3xl border border-border p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
      style={{ backgroundColor: SECTION_WASHES[tint] }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${SECTION_TINTS[tint]}`}>
          <Icon className="size-4" />
        </span>
        <h2 className="font-heading text-base font-medium tracking-tight">{title}</h2>
        {count !== undefined && <span className="text-sm text-muted-foreground">({count})</span>}
      </div>
      {children}
    </div>
  );
}

function BookShelf({
  books,
}: {
  books: { id: number; name: string; slug: string; hasImage: boolean; writers: string[] }[];
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {books.map((b) => (
        <Link key={b.id} href={`/kitap/${b.slug}`} className="flex w-24 flex-col gap-1">
          <BookCover
            title={b.name}
            author={b.writers.join(", ") || "Yazar bilinmiyor"}
            tone={toneForId(b.id)}
            bookId={b.id}
            hasImage={b.hasImage}
            size="sm"
            className="w-full"
          />
          {/* Her kitabın kendi altında, tam kendi genişliğinde küçük bir
              raf çıtası - tek bir ortak çıta öğe sayısına göre boş alana
              doğru gerilip kopuk/bozuk görünüyordu (gerçek bir görsel hata,
              ekran görüntüsüyle bulundu). Kendi genişliğine bağlı olduğu
              için sayı ne olursa olsun her zaman doğru görünür. */}
          <div className="h-1.5 w-full rounded-b-[1px] bg-gradient-to-b from-amber-700/60 to-amber-950/70 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.4)] dark:from-amber-800/50 dark:to-amber-950/60" />
          <p className="truncate text-xs font-medium">{b.name}</p>
          <p className="truncate text-[0.7rem] text-muted-foreground">{b.writers.join(", ") || "Yazar bilinmiyor"}</p>
        </Link>
      ))}
    </div>
  );
}

function EntityChipShelf({
  items,
  hrefPrefix,
}: {
  items: { id: number; name: string; slug: string }[];
  hrefPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`${hrefPrefix}/${item.slug}`}
          className="flex items-center gap-2 rounded-full border border-border py-1 pr-3.5 pl-1 text-sm transition-colors hover:border-foreground/20 hover:bg-accent"
        >
          <EntityAvatar id={item.id} name={item.name} size="size-7" />
          <span className="whitespace-nowrap">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}
