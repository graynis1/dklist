import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, FlatList, Image, Alert, RefreshControl } from "react-native";
import { shareLink } from "@/lib/share";
import { showActionSheet } from "@/components/ActionSheet";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheckIcon, MessageCircleIcon, MoreHorizontalIcon, UserPlusIcon, UserCheckIcon, LockIcon, LibraryIcon, AwardIcon, PencilIcon, Share2Icon, ChevronLeftIcon, NewspaperIcon, ChevronRightIcon, PlusIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReadingStatsSection } from "@/components/ReadingStats";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { getProfile, toggleFollow, toggleBlock, type OtherProfileResponse } from "@/api/profileOther";
import type { ReadStatus } from "@/api/library";
import { API_BASE_URL } from "@/api/config";
import { badgeImageUrl } from "@/api/community";

const SHELF_LABELS: Record<ReadStatus, string> = {
  currentRead: "Şu an okuyor",
  finishRead: "Okudu",
  targetRead: "Okuyacak",
  dropRead: "Yarıda bıraktı",
};
const SHELVES: ReadStatus[] = ["currentRead", "finishRead", "targetRead", "dropRead"];

function ActionButton({ label, icon, onPress, primary, disabled, square }: { label?: string; icon: React.ReactNode; onPress: () => void; primary?: boolean; disabled?: boolean; square?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: square ? undefined : 1,
        width: square ? 44 : undefined,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: radius.lg,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: primary ? (pressed ? colors.accent700 : colors.accent) : pressed ? colors.neutral300 : colors.neutral200,
      })}
    >
      {icon}
      {label && (
        <ThemedText variant="bodySemibold" color={primary ? "#fff" : colors.text} style={{ fontSize: 14 }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export default function OtherProfileScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<OtherProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);
  const [tab, setTab] = useState<"library" | "stats" | "blogs" | "badges">("library");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      setData(await getProfile(username));
    } catch {
      setData(null);
    }
  }, [username]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onToggleFollow() {
    if (!data) return;
    setFollowSaving(true);
    try {
      const r = await toggleFollow(username);
      setData({ ...data, following: r.following, counts: { ...data.counts, followers: data.counts.followers + (r.following ? 1 : -1) } });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İşlem yapılamadı.");
    } finally {
      setFollowSaving(false);
    }
  }

  function onShare() {
    const url = `https://dklist.com/profil/${username}`;
    shareLink(`DKList'te @${username} profiline göz at`, url);
  }

  function onMore() {
    if (!data) return;
    showActionSheet({
      title: `@${username}`,
      options: [
      { text: "Profili paylaş", onPress: onShare },
      {
        text: data.blocked ? "Engeli kaldır" : "Engelle",
        destructive: !data.blocked,
        onPress: () => {
          const run = async () => {
            await toggleBlock(username);
            await load();
          };
          if (data.blocked) run();
          else
            Alert.alert("Engellensin mi?", `@${username} sana mesaj gönderemeyecek ve seni takip edemeyecek.`, [
              { text: "Vazgeç", style: "cancel" },
              { text: "Engelle", style: "destructive", onPress: run },
            ]);
        },
      },
      ],
      cancelText: "Kapat",
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState icon={<LockIcon size={30} color={colors.accent} />} title="Kullanıcı bulunamadı" subtitle="Bu profil silinmiş ya da hiç var olmamış olabilir." />
      </View>
    );
  }

  const { profile, counts, isSelf, following, blocked, canSeeLibrary, badges, library } = data;
  const blogs = data.blogs ?? [];
  const glass = { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center" as const, justifyContent: "center" as const };
  const displayName = [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username;
  const readCount = library?.finishRead.length ?? 0;
  const AVATAR = 112;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={{ backgroundColor: colors.card, paddingBottom: spacing.md, ...shadow.sm }}>
        <LinearGradient colors={[colors.accent800, colors.accent500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150 + insets.top }}>
          <View style={{ position: "absolute", top: insets.top + 6, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between", zIndex: 2 }}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={8} style={glass} accessibilityLabel="Geri">
              <ChevronLeftIcon size={23} color="#fff" />
            </Pressable>
            <Pressable onPress={onShare} hitSlop={8} style={glass} accessibilityLabel="Profili paylaş">
              <Share2Icon size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={{ position: "absolute", right: -40, top: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <View style={{ position: "absolute", right: 70, bottom: -50, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <ThemedText variant="quote" color="rgba(255,255,255,0.75)" style={{ position: "absolute", right: spacing.lg, bottom: spacing.md, fontSize: 13 }}>
            “Bir kitap, bir dünya.”
          </ThemedText>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ marginTop: -AVATAR / 2, alignSelf: "flex-start", borderRadius: AVATAR, padding: 4, backgroundColor: colors.card }}>
            <Avatar id={profile.id} name={displayName} imageUrl={profile.image} size={AVATAR} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
            <ThemedText variant="headline" style={{ fontSize: 26 }} numberOfLines={1}>{displayName}</ThemedText>
            {profile.verified && <BadgeCheckIcon size={20} color={colors.accent} fill={`${colors.accent}30`} />}
          </View>
          <ThemedText variant="body" muted>@{profile.username}</ThemedText>

          {profile.biyo ? (
            <ThemedText variant="body" style={{ marginTop: spacing.sm, lineHeight: 21 }}>{profile.biyo}</ThemedText>
          ) : null}

          <View style={{ flexDirection: "row", marginTop: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.neutral100 }}>
            {[
              { n: readCount, label: "Okudu", onPress: () => setTab("library") },
              { n: counts.followers, label: "Takipçi" },
              { n: counts.following, label: "Takip" },
              { n: badges.length, label: "Rozet", onPress: () => setTab("badges") },
            ].map((st, i) => (
              <Pressable key={st.label} disabled={!st.onPress} onPress={st.onPress} style={{ flex: 1, alignItems: "center", borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: colors.divider }}>
                <ThemedText variant="title" style={{ fontSize: 19 }}>{st.n}</ThemedText>
                <ThemedText variant="caption" muted>{st.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            {isSelf ? (
              <>
                <ActionButton primary label="Profili Düzenle" icon={<PencilIcon size={16} color="#fff" />} onPress={() => router.push("/hesap-duzenle")} />
                <ActionButton label="Paylaş" icon={<Share2Icon size={16} color={colors.text} />} onPress={onShare} />
              </>
            ) : (
              <>
                <ActionButton
                  primary={!following}
                  label={following ? "Takip Ediliyor" : "Takip Et"}
                  icon={following ? <UserCheckIcon size={17} color={colors.text} /> : <UserPlusIcon size={17} color="#fff" />}
                  onPress={onToggleFollow}
                  disabled={followSaving || blocked}
                />
                <ActionButton
                  label="Mesaj"
                  icon={<MessageCircleIcon size={17} color={colors.text} />}
                  onPress={() => router.push({ pathname: "/mesajlar/[username]", params: { username } })}
                  disabled={blocked}
                />
                <ActionButton square icon={<MoreHorizontalIcon size={20} color={colors.text} />} onPress={onMore} />
              </>
            )}
          </View>
          {blocked && (
            <ThemedText variant="caption" color={colors.accent700} style={{ marginTop: spacing.sm }}>
              Bu kullanıcıyı engelledin. Engeli kaldırmak için ⋯ menüsünü kullan.
            </ThemedText>
          )}
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, marginTop: spacing.sm }}>
        <SegmentedTabs
          scrollable={false}
          tabs={[
            { key: "library" as const, label: "Kitaplık" },
            { key: "stats" as const, label: "İstatistik" },
            ...(blogs.length > 0 || isSelf ? [{ key: "blogs" as const, label: "Bloglar", count: blogs.length || undefined }] : []),
            { key: "badges" as const, label: "Rozetler", count: badges.length || undefined },
          ]}
          active={tab}
          onChange={setTab}
        />
      </View>

      {tab === "stats" ? (
        !canSeeLibrary ? (
          <EmptyState icon={<LockIcon size={30} color={colors.accent} />} title="İstatistikler gizli" subtitle={`@${profile.username} profilini gizli tutuyor.`} />
        ) : (
          <ReadingStatsSection
            username={profile.username}
            isSelf={isSelf}
            goal={data.readingGoal ?? null}
            pastGoals={data.pastGoals ?? []}
            stats={data.stats ?? null}
            monthly={data.monthly ?? null}
            onGoalChanged={load}
          />
        )
      ) : tab === "blogs" ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {isSelf && (
            <Pressable onPress={() => router.push("/blog/yeni")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent700 : colors.accent })}>
              <PlusIcon size={18} color="#fff" />
              <ThemedText variant="bodySemibold" color="#fff">Yeni yazı</ThemedText>
            </Pressable>
          )}
          {blogs.length === 0 ? (
            <EmptyState icon={<NewspaperIcon size={30} color={colors.accent} />} title="Henüz blog yazısı yok" subtitle={isSelf ? "Okuduklarını, düşüncelerini yaz; DKList okurlarıyla paylaş." : "Bu okur henüz yazı paylaşmamış."} />
          ) : (
            <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden" }}>
              {blogs.map((b, i) => (
                <Pressable key={b.id} onPress={() => router.push({ pathname: "/blog/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral100 : colors.card })}>
                  <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                    <NewspaperIcon size={19} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySemibold" numberOfLines={2}>{b.title}</ThemedText>
                    {!b.approved && <ThemedText variant="caption" color={colors.accent700}>Onay bekliyor</ThemedText>}
                  </View>
                  <ChevronRightIcon size={18} color={colors.neutral400} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : tab === "library" ? (
        !canSeeLibrary ? (
          <EmptyState icon={<LockIcon size={30} color={colors.accent} />} title="Kitaplık gizli" subtitle={`@${profile.username} kitaplığını yalnızca kendisi görebilecek şekilde ayarlamış.`} />
        ) : !library || SHELVES.every((s) => library[s].length === 0) ? (
          <EmptyState icon={<LibraryIcon size={30} color={colors.accent} />} title="Kitaplık henüz boş" subtitle={isSelf ? "Kitap sayfalarından okuma durumunu işaretleyerek başla." : "Bu okur henüz rafına kitap eklememiş."} />
        ) : (
          SHELVES.filter((s) => library[s].length > 0).map((shelf) => (
            <View key={shelf} style={{ backgroundColor: colors.card, marginTop: spacing.sm, paddingVertical: spacing.md, ...shadow.sm }}>
              <View style={{ paddingHorizontal: spacing.lg }}>
                <SectionHeader title={SHELF_LABELS[shelf]} count={library[shelf].length} />
              </View>
              <FlatList
                data={library[shelf]}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })} style={({ pressed }) => ({ width: 104, gap: 6, opacity: pressed ? 0.8 : 1 })}>
                    <View style={{ borderRadius: 5, ...shadow.md }}>
                      <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={104} height={154} hasImage={item.hasImage} />
                    </View>
                    <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12, lineHeight: 15.5 }}>{item.name}</ThemedText>
                    {item.writers.length > 0 && (
                      <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: -4 }}>{item.writers.join(", ")}</ThemedText>
                    )}
                  </Pressable>
                )}
              />
            </View>
          ))
        )
      ) : badges.length === 0 ? (
        <EmptyState icon={<AwardIcon size={30} color={colors.accent} />} title="Henüz rozet yok" subtitle="Okudukça, yorum yaptıkça ve toplulukta aktif oldukça rozetler kazanılır." />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.lg }}>
          {badges.map((b) => {
            const img = badgeImageUrl(b.img, API_BASE_URL);
            return (
              <View
                key={b.id}
                style={{ width: "48.5%", backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.md, alignItems: "center", gap: 6, ...shadow.sm }}
              >
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {img ? <Image source={{ uri: img }} style={{ width: 52, height: 52, borderRadius: 26 }} /> : <AwardIcon size={28} color={colors.accent} />}
                </View>
                <ThemedText variant="title" style={{ textAlign: "center", fontSize: 15 }} numberOfLines={2}>{b.name}</ThemedText>
                {b.comment ? (
                  <ThemedText variant="caption" muted style={{ textAlign: "center" }} numberOfLines={3}>{b.comment}</ThemedText>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
