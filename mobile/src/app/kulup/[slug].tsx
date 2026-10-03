import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Alert, Switch, StyleSheet } from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PencilIcon, MoreHorizontalIcon, ImageIcon, ChevronLeftIcon, ChevronRightIcon, Share2Icon, BadgeCheckIcon, CheckIcon, ClockIcon, UserPlusIcon, BookOpenIcon, Trash2Icon, UsersIcon } from "lucide-react-native";
import { FloatingBack } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { showActionSheet } from "@/components/ActionSheet";
import { shareLink } from "@/lib/share";
import { ClubMark, clubDisplayName, clubHue, CLUB_COLORS } from "@/components/ClubMark";
import { ClubPostsSection } from "@/components/ClubPosts";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { useAuth } from "@/auth/AuthContext";
import { search, type SearchResultBook } from "@/api/search";
import {
  getClub,
  joinClub,
  leaveClub,
  getClubJoinRequests,
  respondToClubJoinRequest,
  setClubRequiresApproval,
  removeClubMember,
  updateClubName,
  updateClubDescription,
  updateClubCurrentBook,
  deleteClub,
  setClubMemberRole,
  updateClubBranding,
  type ClubDetail,
  type ClubJoinRequest,
} from "@/api/clubs";

const MANAGE_ROLES = ["Admin", "Mod"];

export default function KulupDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
  const { profile } = useAuth();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<ClubJoinRequest[]>([]);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);

  const [serverCanManage, setServerCanManage] = useState<boolean | null>(null);
  const [brandingBusy, setBrandingBusy] = useState(false);
  const isOwnerViewer = Boolean(club && profile && (club.ownerId === profile.id || MANAGE_ROLES.includes(profile.userType)));
  // Club admins (role "admin") can manage too - the server says so.
  const canManage = serverCanManage ?? isOwnerViewer;

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getClub(slug);
    if (!ignore?.current) {
      setClub(result.club);
      setIsMember(result.isMember);
      setIsPending(result.isPending);
      if (typeof result.canManage === "boolean") setServerCanManage(result.canManage);
    }
  }, [slug]);

  const loadRequests = useCallback(async (ignore?: { current: boolean }) => {
    try {
      const result = await getClubJoinRequests(slug);
      if (!ignore?.current) setRequests(result.items);
    } catch {
      // Not the owner/mod (or the request failed) - the panel below
      // simply won't render for a non-manager, so a silent empty list is
      // the correct fallback rather than surfacing an error nobody caused.
    }
  }, [slug]);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests(ignore);
    return () => {
      ignore.current = true;
    };
  }, [canManage, loadRequests]);

  async function onToggleMembership() {
    setSaving(true);
    try {
      if (isMember) {
        await leaveClub(slug);
      } else {
        await joinClub(slug);
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onRespondToRequest(userId: number, action: "approve" | "reject") {
    try {
      await respondToClubJoinRequest(slug, userId, action);
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İşlem başarısız oldu.");
    }
  }

  async function onToggleApproval(value: boolean) {
    setApprovalBusy(true);
    try {
      await setClubRequiresApproval(slug, value);
      await load();
      if (value) await loadRequests();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setApprovalBusy(false);
    }
  }

  function onRemoveMember(userId: number, username: string) {
    Alert.alert("Üyeyi Çıkar", `@${username} kulüpten çıkarılsın mı?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkar",
        style: "destructive",
        onPress: async () => {
          try {
            await removeClubMember(slug, userId);
            await load();
          } catch (err) {
            Alert.alert("Hata", err instanceof Error ? err.message : "Üye çıkarılamadı.");
          }
        },
      },
    ]);
  }

  function openInfoEdit() {
    if (!club) return;
    setNameDraft(club.name);
    setDescriptionDraft(club.description);
    setEditingInfo(true);
  }

  async function onSaveInfo() {
    if (!nameDraft.trim() || !descriptionDraft.trim()) {
      Alert.alert("Eksik bilgi", "Kulüp adı ve açıklaması boş olamaz.");
      return;
    }
    setInfoSaving(true);
    try {
      await updateClubName(slug, nameDraft.trim());
      await updateClubDescription(slug, descriptionDraft.trim());
      setEditingInfo(false);
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setInfoSaving(false);
    }
  }

  async function onBookQueryChange(q: string) {
    setBookQuery(q);
    if (q.trim().length < 2) {
      setBookResults([]);
      return;
    }
    const result = await search(q);
    setBookResults(result.books.slice(0, 5));
  }

  async function onSelectCurrentBook(book: SearchResultBook) {
    setBookPickerOpen(false);
    setBookQuery("");
    setBookResults([]);
    try {
      await updateClubCurrentBook(slug, book.id);
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    }
  }

  async function onClearCurrentBook() {
    try {
      await updateClubCurrentBook(slug, null);
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    }
  }

  function onDeleteClub() {
    Alert.alert("Kulübü Sil", "Bu kulüp kalıcı olarak silinsin mi? Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteClub(slug);
            router.back();
          } catch (err) {
            Alert.alert("Hata", err instanceof Error ? err.message : "Kulüp silinemedi.");
          }
        },
      },
    ]);
  }

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Logo seçmek için galeri izni vermelisin.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (res.canceled || res.assets.length === 0) return;
    const a = res.assets[0];
    await saveBranding({ image: { uri: a.uri, name: a.fileName ?? `club-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" } });
  }

  async function saveBranding(input: Parameters<typeof updateClubBranding>[1]) {
    setBrandingBusy(true);
    try {
      const r = await updateClubBranding(slug, input);
      setClub((c) => (c ? { ...c, image: r.image, color: r.color } : c));
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setBrandingBusy(false);
    }
  }

  function onMemberMenu(m: { userId: number; username: string; role: string }) {
    showActionSheet({
      title: m.username,
      options: [
        { text: "Profili görüntüle", onPress: () => router.push({ pathname: "/profil/[username]", params: { username: m.username } }) },
        ...(isOwnerViewer
          ? [
              {
                text: m.role === "admin" ? "Yöneticilikten al" : "Yönetici yap",
                onPress: async () => {
                  try {
                    await setClubMemberRole(slug, m.userId, m.role === "admin" ? "member" : "admin");
                    await load();
                  } catch (err) {
                    Alert.alert("Hata", err instanceof Error ? err.message : "Rol değiştirilemedi.");
                  }
                },
              },
            ]
          : []),
        { text: "Kulüpten çıkar", destructive: true, onPress: () => onRemoveMember(m.userId, m.username) },
      ],
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <FloatingBack />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}>
        <FloatingBack />
        <EmptyState icon={<UsersIcon size={30} color={colors.accent} />} title="Kulüp bulunamadı" subtitle="Bu kulüp silinmiş ya da bağlantı hatalı olabilir." />
      </View>
    );
  }

  const official = /^dklist\s*\|/i.test(club.name);
  const hue = clubHue(club.name, club.color);
  const descLines = club.description.split(/\n/).map((l) => l.trim());
  const longDesc = club.description.length > 280 || descLines.length > 7;
  const shownLines = descExpanded || !longDesc ? descLines : descLines.slice(0, 6);
  const glass = { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center" as const, justifyContent: "center" as const };
  const ROLE_LABEL: Record<string, string> = { owner: "Kurucu", admin: "Yönetici", moderator: "Moderatör" };

  function onShare() {
    if (!club) return;
    void shareLink(`DKList'te "${clubDisplayName(club.name)}" kulübüne göz at`, `https://dklist.com/kulup/${slug}`);
  }

  function onMemberAction() {
    if (isMember) {
      showActionSheet({
        title: clubDisplayName(club!.name),
        options: [{ text: "Kulüpten ayrıl", destructive: true, onPress: () => void onToggleMembership() }],
      });
    } else if (!isPending) {
      void onToggleMembership();
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
      {/* Cover */}
      <LinearGradient colors={hue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 130 + insets.top }}>
        <View style={{ position: "absolute", right: -40, top: -20, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ position: "absolute", top: insets.top + 6, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/kulupler"))} hitSlop={8} style={glass} accessibilityLabel="Geri">
            <ChevronLeftIcon size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={onShare} hitSlop={8} style={glass} accessibilityLabel="Kulübü paylaş">
            <Share2Icon size={18} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Identity */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <View style={{ marginTop: -44, alignSelf: "flex-start", padding: 4, borderRadius: 30, backgroundColor: colors.card }}>
          <ClubMark name={club.name} size={84} image={club.image} color={club.color} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
          <ThemedText variant="headline" style={{ flexShrink: 1, fontSize: 23 }}>{clubDisplayName(club.name)}</ThemedText>
          {official && <BadgeCheckIcon size={20} color={colors.accent} />}
        </View>
        <ThemedText variant="body" muted style={{ marginTop: 2, fontSize: 14 }}>
          {official ? "Resmi DKList kulübü · " : ""}{club.memberCount} üye · {club.visibility === "public" ? "Herkese açık" : "Gizli"}
        </ThemedText>

        {/* Member faces */}
        {club.members.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
            {club.members.slice(0, 6).map((m, i) => (
              <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: 18, borderWidth: 2, borderColor: colors.card }}>
                <Avatar id={m.userId} name={m.username} imageUrl={m.image} size={30} />
              </View>
            ))}
            <ThemedText variant="caption" muted style={{ marginLeft: spacing.sm }}>
              {club.members.slice(0, 2).map((m) => m.username).join(", ")}
              {club.memberCount > 2 ? ` ve ${club.memberCount - 2} kişi daha` : ""}
            </ThemedText>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          {canManage ? (
            <Pressable onPress={openInfoEdit} style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: radius.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
              <PencilIcon size={16} color={colors.text} />
              <ThemedText variant="bodySemibold">Kulübü düzenle</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={onMemberAction}
              disabled={saving || isPending}
              style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: radius.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.6 : 1, backgroundColor: isMember || isPending ? (pressed ? colors.neutral300 : colors.neutral200) : pressed ? colors.accent700 : colors.accent })}
            >
              {saving ? (
                <ActivityIndicator color={isMember ? colors.text : "#fff"} />
              ) : isMember ? (
                <>
                  <CheckIcon size={17} color={colors.text} />
                  <ThemedText variant="bodySemibold">Üyesin</ThemedText>
                </>
              ) : isPending ? (
                <>
                  <ClockIcon size={16} color={colors.textMuted} />
                  <ThemedText variant="bodySemibold" muted>Onay bekliyor</ThemedText>
                </>
              ) : (
                <>
                  <UserPlusIcon size={17} color="#fff" />
                  <ThemedText variant="bodySemibold" color="#fff">Kulübe katıl</ThemedText>
                </>
              )}
            </Pressable>
          )}
          <Pressable onPress={onShare} style={({ pressed }) => ({ height: 44, paddingHorizontal: 18, borderRadius: radius.lg, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
            <Share2Icon size={16} color={colors.text} />
            <ThemedText variant="bodySemibold">Paylaş</ThemedText>
          </Pressable>
        </View>
      </View>

      {editingInfo && (
        <Section title="Kulüp bilgileri">
          <View style={{ gap: spacing.sm }}>
            <TextField label="Kulüp adı" value={nameDraft} onChangeText={setNameDraft} />
            <TextField label="Açıklama" value={descriptionDraft} onChangeText={setDescriptionDraft} multiline style={{ height: 120, textAlignVertical: "top", paddingTop: 10 }} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button title="Vazgeç" variant="secondary" onPress={() => setEditingInfo(false)} disabled={infoSaving} />
              <Button title="Kaydet" onPress={onSaveInfo} disabled={infoSaving} />
            </View>
          </View>
        </Section>
      )}

      {/* Current book */}
      {(club.currentBookName || canManage) && (
        <Section title="Şu an birlikte okunan">
          {bookPickerOpen ? (
            <View style={{ gap: spacing.xs }}>
              <TextField label="Kitap ara" value={bookQuery} onChangeText={onBookQueryChange} placeholder="Kitap adı…" autoFocus />
              {bookResults.map((b) => (
                <Pressable key={b.id} onPress={() => onSelectCurrentBook(b)} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
                  <BookCover id={b.id} title={b.name} width={30} height={44} hasImage={b.hasImage} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" numberOfLines={1}>{b.name}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
                  </View>
                </Pressable>
              ))}
              <ThemedText variant="bodySemibold" muted onPress={() => setBookPickerOpen(false)} style={{ paddingVertical: 6 }}>Vazgeç</ThemedText>
            </View>
          ) : club.currentBookName ? (
            <View style={{ gap: spacing.md }}>
              <Pressable
                onPress={() => club.currentBookSlug && router.push({ pathname: "/kitap/[slug]", params: { slug: club.currentBookSlug } })}
                style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, alignItems: "center", opacity: pressed ? 0.75 : 1 })}
              >
                <View style={{ borderRadius: 4, ...shadow.md }}>
                  <BookCover id={club.currentBookId ?? 0} title={club.currentBookName} width={60} height={90} hasImage={club.currentBookHasImage} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 17 }}>{club.currentBookName}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 13 }}>{club.currentBookWriters.join(", ")}</ThemedText>
                  <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600", marginTop: 4 }}>Kitabı incele</ThemedText>
                </View>
                <ChevronRightIcon size={18} color={colors.neutral400} />
              </Pressable>
              {canManage && (
                <View style={{ flexDirection: "row", gap: spacing.lg }}>
                  <ThemedText variant="bodySemibold" color={colors.accent700} onPress={() => setBookPickerOpen(true)}>Değiştir</ThemedText>
                  <ThemedText variant="bodySemibold" muted onPress={onClearCurrentBook}>Kaldır</ThemedText>
                </View>
              )}
            </View>
          ) : (
            <Pressable onPress={() => setBookPickerOpen(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.accent400, backgroundColor: pressed ? colors.accent100 : "transparent" })}>
              <BookOpenIcon size={20} color={colors.accent} />
              <ThemedText variant="bodySemibold" color={colors.accent800}>Birlikte okunacak kitabı seç</ThemedText>
            </Pressable>
          )}
        </Section>
      )}

      {/* About */}
      {club.description.trim() ? (
        <Section title="Hakkında">
          <View style={{ gap: 6 }}>
            {shownLines.map((line, i) =>
              /^[*•-]\s*/.test(line) ? (
                <View key={i} style={{ flexDirection: "row", gap: 10, paddingLeft: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 }} />
                  <ThemedText variant="body" style={{ flex: 1, lineHeight: 22 }}>{line.replace(/^[*•-]\s*/, "")}</ThemedText>
                </View>
              ) : line ? (
                <ThemedText key={i} variant="body" style={{ lineHeight: 22 }}>{line}</ThemedText>
              ) : (
                <View key={i} style={{ height: 4 }} />
              ),
            )}
          </View>
          {longDesc && (
            <ThemedText variant="bodySemibold" color={colors.accent700} style={{ marginTop: spacing.sm }} onPress={() => setDescExpanded((v) => !v)}>
              {descExpanded ? "Daha az göster" : "Devamını gör"}
            </ThemedText>
          )}
        </Section>
      ) : null}

      <ClubPostsSection slug={slug} canPost={isMember} canManage={canManage} />

      {/* Members */}
      <Section title={`Üyeler · ${club.members.length}`}>
        <View>
          {club.members.map((m, i) => (
            <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.divider }}>
              <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username: m.username } })} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
                <Avatar id={m.userId} name={m.username} imageUrl={m.image} size={40} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySemibold" numberOfLines={1}>{m.username}</ThemedText>
                  {ROLE_LABEL[m.role] ? <ThemedText variant="caption" color={colors.accent700}>{ROLE_LABEL[m.role]}</ThemedText> : null}
                </View>
              </Pressable>
              {canManage && m.role !== "owner" && m.userId !== profile?.id && (
                <Pressable onPress={() => onMemberMenu(m)} hitSlop={8} accessibilityLabel="Üye seçenekleri" style={{ padding: 6 }}>
                  <MoreHorizontalIcon size={19} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </Section>

      {/* Management */}
      {canManage && (
        <Section title="Yönetim">
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="label" color={colors.textMuted}>Görünüm</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <ClubMark name={club.name} size={56} image={club.image} color={club.color} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Pressable onPress={pickLogo} disabled={brandingBusy} style={({ pressed }) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
                    {brandingBusy ? <ActivityIndicator size="small" color={colors.text} /> : <ImageIcon size={15} color={colors.text} />}
                    <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>{club.image ? "Logoyu değiştir" : "Logo yükle"}</ThemedText>
                  </Pressable>
                  {club.image ? <ThemedText variant="caption" color={colors.textMuted} onPress={() => void saveBranding({ removeImage: true })}>Logoyu kaldır</ThemedText> : null}
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                {CLUB_COLORS.map((c) => (
                  <Pressable key={c} onPress={() => void saveBranding({ color: c })} disabled={brandingBusy} accessibilityLabel={`Renk ${c}`} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: "center", justifyContent: "center", borderWidth: club.color === c ? 3 : 0, borderColor: colors.card }}>
                    {club.color === c && <CheckIcon size={15} color="#fff" />}
                  </Pressable>
                ))}
                {club.color ? (
                  <Pressable onPress={() => void saveBranding({ color: null })} disabled={brandingBusy} style={{ height: 32, justifyContent: "center", paddingHorizontal: 6 }}>
                    <ThemedText variant="caption" muted>Otomatik</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body">Katılım onayı gerektir</ThemedText>
                <ThemedText variant="caption" muted>Yeni üyeleri sen onayladıktan sonra katılırlar</ThemedText>
              </View>
              <Switch value={club.requiresApproval} onValueChange={onToggleApproval} disabled={approvalBusy} trackColor={{ true: colors.accent, false: colors.neutral300 }} thumbColor="#fff" />
            </View>

            {club.requiresApproval && requests.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="label" color={colors.textMuted}>Bekleyen istekler · {requests.length}</ThemedText>
                {requests.map((r) => (
                  <View key={r.userId} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Avatar id={r.userId} name={r.username} imageUrl={r.image} size={36} />
                    <ThemedText variant="bodySemibold" style={{ flex: 1 }} numberOfLines={1}>{r.username}</ThemedText>
                    <Pressable onPress={() => onRespondToRequest(r.userId, "reject")} style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
                      <ThemedText variant="caption" style={{ fontWeight: "600" }}>Reddet</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => onRespondToRequest(r.userId, "approve")} style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.accent700 : colors.accent })}>
                      <ThemedText variant="caption" color="#fff" style={{ fontWeight: "600" }}>Onayla</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable onPress={onDeleteClub} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
              <Trash2Icon size={17} color="#c0392b" />
              <ThemedText variant="bodySemibold" color="#c0392b">Kulübü sil</ThemedText>
            </Pressable>
          </View>
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ marginTop: spacing.md, marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card, gap: spacing.md }}>
      <ThemedText variant="title" style={{ fontSize: 17 }}>{title}</ThemedText>
      {children}
    </View>
  );
}
