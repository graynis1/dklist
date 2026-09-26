import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Alert, Switch } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { XIcon, PencilIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
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
  type ClubDetail,
  type ClubJoinRequest,
} from "@/api/clubs";

const MANAGE_ROLES = ["Admin", "Mod"];

export default function KulupDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
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

  const canManage = Boolean(
    club && profile && (club.ownerId === profile.id || MANAGE_ROLES.includes(profile.userType)),
  );

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getClub(slug);
    if (!ignore?.current) {
      setClub(result.club);
      setIsMember(result.isMember);
      setIsPending(result.isPending);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Kulüp bulunamadı.</ThemedText>
      </View>
    );
  }

  const buttonTitle = isMember ? "Kulüpten Ayrıl" : isPending ? "Onay Bekliyor" : "Katıl";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {editingInfo ? (
        <View style={{ gap: spacing.sm }}>
          <TextField label="Kulüp Adı" value={nameDraft} onChangeText={setNameDraft} />
          <TextField label="Açıklama" value={descriptionDraft} onChangeText={setDescriptionDraft} multiline style={{ height: 80 }} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button title="Vazgeç" variant="secondary" onPress={() => setEditingInfo(false)} disabled={infoSaving} />
            <Button title="Kaydet" onPress={onSaveInfo} disabled={infoSaving} />
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ThemedText variant="headline" style={{ flex: 1 }}>{club.name}</ThemedText>
            {canManage && (
              <Pressable onPress={openInfoEdit} hitSlop={8}>
                <PencilIcon size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <ThemedText variant="caption" muted>{club.memberCount} üye · {club.visibility === "public" ? "Herkese açık" : "Gizli"}</ThemedText>
          <ThemedText variant="body">{club.description}</ThemedText>
        </View>
      )}

      {!canManage && (
        <Button title={buttonTitle} variant={isMember ? "secondary" : "primary"} onPress={onToggleMembership} disabled={saving || isPending} />
      )}

      {club.currentBookName && !bookPickerOpen && (
        <View style={{ gap: 4 }}>
          <Pressable
            onPress={() => club.currentBookSlug && router.push({ pathname: "/kitap/[slug]", params: { slug: club.currentBookSlug } })}
          >
            <ThemedText variant="label" color={colors.textMuted}>Şu An Okunan Kitap</ThemedText>
            <ThemedText variant="title">{club.currentBookName}</ThemedText>
            <ThemedText variant="caption" muted>{club.currentBookWriters.join(", ")}</ThemedText>
          </Pressable>
          {canManage && (
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: 4 }}>
              <Pressable onPress={() => setBookPickerOpen(true)}>
                <ThemedText variant="caption" color={colors.accent}>Değiştir</ThemedText>
              </Pressable>
              <Pressable onPress={onClearCurrentBook}>
                <ThemedText variant="caption" color={colors.textMuted}>Kaldır</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {canManage && !club.currentBookName && !bookPickerOpen && (
        <Pressable onPress={() => setBookPickerOpen(true)}>
          <ThemedText variant="caption" color={colors.accent}>+ Şu an okunan kitabı seç</ThemedText>
        </Pressable>
      )}

      {bookPickerOpen && (
        <View style={{ gap: spacing.xs }}>
          <TextField label="Kitap ara" value={bookQuery} onChangeText={onBookQueryChange} placeholder="Kitap adı…" autoFocus />
          {bookResults.map((b) => (
            <Pressable key={b.id} onPress={() => onSelectCurrentBook(b)} style={{ paddingVertical: 6 }}>
              <ThemedText variant="body" numberOfLines={1}>{b.name}</ThemedText>
              <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
            </Pressable>
          ))}
          <Pressable onPress={() => setBookPickerOpen(false)}>
            <ThemedText variant="caption" muted>Vazgeç</ThemedText>
          </Pressable>
        </View>
      )}

      {canManage && (
        <View style={{ gap: spacing.sm, borderWidth: 1, borderColor: colors.divider, borderRadius: 12, padding: spacing.md }}>
          <ThemedText variant="label" color={colors.textMuted}>Kulüp Yönetimi</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ThemedText variant="body">Katılım onayı gerektir</ThemedText>
            <Switch value={club.requiresApproval} onValueChange={onToggleApproval} disabled={approvalBusy} />
          </View>

          {club.requiresApproval && requests.length > 0 && (
            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <ThemedText variant="caption" muted>Bekleyen İstekler ({requests.length})</ThemedText>
              {requests.map((r) => (
                <View key={r.userId} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Avatar id={r.userId} name={r.username} size={26} />
                  <ThemedText variant="body" style={{ flex: 1 }}>@{r.username}</ThemedText>
                  <Pressable onPress={() => onRespondToRequest(r.userId, "reject")}>
                    <ThemedText variant="caption" color={colors.textMuted}>Reddet</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => onRespondToRequest(r.userId, "approve")}>
                    <ThemedText variant="caption" color={colors.accent}>Onayla</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={onDeleteClub} style={{ marginTop: spacing.sm }}>
            <ThemedText variant="caption" color="#c0392b">Kulübü Sil</ThemedText>
          </Pressable>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Üyeler ({club.members.length})</ThemedText>
        {club.members.map((m) => (
          <View key={m.userId} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <Pressable
              onPress={() => router.push({ pathname: "/profil/[username]", params: { username: m.username } })}
              style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", flex: 1 }}
            >
              <Avatar id={m.userId} name={m.username} size={28} />
              <ThemedText variant="body">@{m.username}</ThemedText>
              {m.role !== "member" && <ThemedText variant="caption" color={colors.accent}>· {m.role}</ThemedText>}
            </Pressable>
            {canManage && m.role !== "owner" && m.userId !== profile?.id && (
              <Pressable onPress={() => onRemoveMember(m.userId, m.username)} style={{ padding: 4 }}>
                <XIcon size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
