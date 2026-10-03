import { useRef, useState } from "react";
import { View, Pressable, Modal, TextInput, ActivityIndicator, Alert } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { TargetIcon, PencilIcon, Share2Icon, BookOpenIcon, FileTextIcon, ClockIcon, TagIcon, FeatherIcon, TrophyIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { setReadingGoal, type ReadingGoal, type ReadingStats as Stats } from "@/api/profileOther";

const MONTHS = ["O", "Ş", "M", "N", "M", "H", "T", "A", "E", "E", "K", "A"];

function Ring({ progress, size, stroke, track }: { progress: number; size: number; stroke: number; track: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Defs>
        <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffe3bf" />
          <Stop offset="1" stopColor="#facb8d" />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {p > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />}
    </Svg>
  );
}

/** The yearly goal as a shareable card - captured to an image for Instagram/WhatsApp. */
function GoalCard({ goal, username, stats }: { goal: ReadingGoal; username: string; stats: Stats | null }) {
  const { colors, spacing, radius } = useTheme();
  const pct = goal.targetCount > 0 ? Math.round((goal.readCount / goal.targetCount) * 100) : 0;
  const done = goal.readCount >= goal.targetCount;
  return (
    <LinearGradient colors={["#3a270d", colors.accent700, "#a06f24"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: spacing.xl, overflow: "hidden" }}>
      <View style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)" }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText variant="label" color="rgba(255,255,255,0.8)">{goal.year} okuma hedefi</ThemedText>
        <ThemedText variant="brand" color="rgba(255,255,255,0.9)" style={{ fontSize: 20 }}>dklist</ThemedText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xl, marginTop: spacing.lg }}>
        <View style={{ width: 128, height: 128, alignItems: "center", justifyContent: "center" }}>
          <Ring progress={goal.readCount / Math.max(1, goal.targetCount)} size={128} stroke={11} track="rgba(255,255,255,0.15)" />
          <View style={{ position: "absolute", alignItems: "center" }}>
            <ThemedText variant="display" color="#fff" style={{ fontSize: 30 }}>%{Math.min(pct, 999)}</ThemedText>
            {done && <TrophyIcon size={16} color="#ffe3bf" />}
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText variant="display" color="#fff" style={{ fontSize: 34, lineHeight: 38 }}>
            {goal.readCount}
            <ThemedText variant="headline" color="rgba(255,255,255,0.6)" style={{ fontSize: 20 }}> / {goal.targetCount}</ThemedText>
          </ThemedText>
          <ThemedText variant="body" color="rgba(255,255,255,0.85)">kitap okundu</ThemedText>
          <ThemedText variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>
            {done ? "Hedef tamamlandı! 🎉" : `${goal.targetCount - goal.readCount} kitap kaldı`}
          </ThemedText>
        </View>
      </View>
      {stats && (stats.totalPages > 0 || stats.topWriter) ? (
        <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" }}>
          {stats.totalPages > 0 && (
            <View>
              <ThemedText variant="title" color="#fff">{stats.totalPages.toLocaleString("tr-TR")}</ThemedText>
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)">sayfa</ThemedText>
            </View>
          )}
          {stats.topWriter && (
            <View style={{ flex: 1 }}>
              <ThemedText variant="title" color="#fff" numberOfLines={1}>{stats.topWriter}</ThemedText>
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)">en çok okunan yazar</ThemedText>
            </View>
          )}
        </View>
      ) : null}
      <ThemedText variant="caption" color="rgba(255,255,255,0.6)" style={{ marginTop: spacing.md }}>@{username} · dklist.com</ThemedText>
    </LinearGradient>
  );
}

function StatTile({ icon, value, label, wide }: { icon: React.ReactNode; value: string; label: string; wide?: boolean }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ width: wide ? "100%" : "48.5%", backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: 6 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <ThemedText variant="title" numberOfLines={1} style={{ fontSize: 19 }}>{value}</ThemedText>
      <ThemedText variant="caption" muted numberOfLines={1}>{label}</ThemedText>
    </View>
  );
}

export function ReadingStatsSection({
  username,
  isSelf,
  goal,
  pastGoals,
  stats,
  monthly,
  onGoalChanged,
}: {
  username: string;
  isSelf: boolean;
  goal: ReadingGoal | null;
  pastGoals: ReadingGoal[];
  stats: Stats | null;
  monthly: number[] | null;
  onGoalChanged: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const cardRef = useRef<View>(null);
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(goal ? String(goal.targetCount) : "");
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const year = String(new Date().getFullYear());
  const maxMonth = Math.max(1, ...(monthly ?? [0]));
  const hasMonthly = (monthly ?? []).some((n) => n > 0);
  const currentMonth = new Date().getMonth();

  async function saveGoal() {
    const n = Number(goalInput);
    if (!Number.isInteger(n) || n < 1) return;
    setSaving(true);
    try {
      await setReadingGoal(n);
      setEditing(false);
      onGoalChanged();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Hedef kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function shareCard() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Okuma hedefini paylaş" });
      }
    } catch {
      Alert.alert("Paylaşılamadı", "Kart görseli oluşturulamadı.");
    } finally {
      setSharing(false);
    }
  }

  const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60 ? `${m % 60} dk` : ""}`.trim() : `${m} dk`);

  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      {goal ? (
        <View style={{ gap: spacing.sm }}>
          <View ref={cardRef} collapsable={false}>
            <GoalCard goal={goal} username={username} stats={stats} />
          </View>
          {isSelf && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={shareCard} disabled={sharing} style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed ? colors.accent700 : colors.accent })}>
                {sharing ? <ActivityIndicator color="#fff" /> : <Share2Icon size={17} color="#fff" />}
                <ThemedText variant="bodySemibold" color="#fff">Kartı paylaş</ThemedText>
              </Pressable>
              <Pressable onPress={() => { setGoalInput(String(goal.targetCount)); setEditing(true); }} style={({ pressed }) => ({ height: 44, paddingHorizontal: 18, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
                <PencilIcon size={15} color={colors.text} />
                <ThemedText variant="bodySemibold">Hedefi değiştir</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ) : isSelf ? (
        <Pressable onPress={() => setEditing(true)} style={({ pressed }) => ({ borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", gap: spacing.sm, backgroundColor: pressed ? colors.accent200 : colors.accent100, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.accent400 })}>
          <TargetIcon size={34} color={colors.accent} />
          <ThemedText variant="headline" style={{ fontSize: 19, textAlign: "center" }}>{year} okuma hedefini belirle</ThemedText>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>Bu yıl kaç kitap okumak istiyorsun? İlerlemeni takip et, kartını paylaş.</ThemedText>
          <View style={{ marginTop: 4, paddingVertical: 10, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.accent }}>
            <ThemedText variant="bodySemibold" color="#fff">Hedef belirle</ThemedText>
          </View>
        </Pressable>
      ) : null}

      {stats && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title" style={{ fontSize: 17 }}>{stats.year} özeti</ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm }}>
            <StatTile icon={<BookOpenIcon size={16} color={colors.accent} />} value={String(stats.booksRead)} label="kitap bitirildi" />
            <StatTile icon={<FileTextIcon size={16} color={colors.accent} />} value={stats.totalPages > 0 ? stats.totalPages.toLocaleString("tr-TR") : "—"} label="sayfa okundu" />
            <StatTile icon={<ClockIcon size={16} color={colors.accent} />} value={stats.totalMinutes > 0 ? fmtMinutes(stats.totalMinutes) : "—"} label="okuma süresi" />
            <StatTile icon={<TagIcon size={16} color={colors.accent} />} value={stats.topCategory ?? "—"} label="favori tür" />
            {stats.topWriter && <StatTile icon={<FeatherIcon size={16} color={colors.accent} />} value={stats.topWriter} label="en çok okunan yazar" wide />}
          </View>
        </View>
      )}

      {hasMonthly && monthly && (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="title" style={{ fontSize: 17 }}>Aylara göre</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 }}>
            {monthly.map((n, i) => (
              <View key={i} style={{ alignItems: "center", flex: 1, gap: 4 }}>
                {n > 0 && <ThemedText variant="caption" style={{ fontSize: 10.5, fontWeight: "600" }}>{n}</ThemedText>}
                <View style={{ width: 14, height: Math.max(4, (n / maxMonth) * 88), borderRadius: 7, backgroundColor: n > 0 ? (i === currentMonth ? colors.accent : colors.accent400) : colors.neutral200 }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {MONTHS.map((m, i) => (
              <ThemedText key={i} variant="caption" muted style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: i === currentMonth ? "700" : "400" }}>{m}</ThemedText>
            ))}
          </View>
        </View>
      )}

      {pastGoals.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="title" style={{ fontSize: 17 }}>Geçmiş yıllar</ThemedText>
          {[...pastGoals].sort((a, b) => b.year.localeCompare(a.year)).map((g) => {
            const p = Math.min(1, g.readCount / Math.max(1, g.targetCount));
            return (
              <View key={g.year} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <ThemedText variant="bodySemibold">{g.year}</ThemedText>
                  <ThemedText variant="caption" muted>{g.readCount} / {g.targetCount} kitap</ThemedText>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.neutral200, overflow: "hidden" }}>
                  <View style={{ width: `${p * 100}%`, height: 8, borderRadius: 4, backgroundColor: p >= 1 ? "#3f8a5a" : colors.accent }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!goal && !stats && !isSelf && (
        <ThemedText variant="body" muted style={{ textAlign: "center", paddingVertical: spacing.xl }}>Henüz okuma istatistiği yok.</ThemedText>
      )}

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <KeyboardScreen style={{ flex: 1 }}>
          <Pressable onPress={() => setEditing(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }}>
              <ThemedText variant="headline" style={{ fontSize: 20 }}>{year} hedefin</ThemedText>
              <ThemedText variant="body" muted>Bu yıl kaç kitap okumayı hedefliyorsun?</ThemedText>
              <TextInput
                value={goalInput}
                onChangeText={(v) => setGoalInput(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                autoFocus
                maxLength={4}
                placeholder="ör. 24"
                placeholderTextColor={colors.textMuted}
                style={{ height: 56, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, textAlign: "center", fontSize: 26, fontFamily: "Inter_700Bold", color: colors.text }}
              />
              <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
                {[12, 24, 36, 52].map((n) => (
                  <Pressable key={n} onPress={() => setGoalInput(String(n))} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: goalInput === String(n) ? colors.accent : colors.neutral200 }}>
                    <ThemedText variant="caption" color={goalInput === String(n) ? "#fff" : colors.text} style={{ fontWeight: "600" }}>{n}</ThemedText>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={saveGoal} disabled={saving || !goalInput} style={({ pressed }) => ({ height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.accent700 : colors.accent, opacity: !goalInput ? 0.5 : 1 })}>
                {saving ? <ActivityIndicator color="#fff" /> : <ThemedText variant="bodySemibold" color="#fff">Kaydet</ThemedText>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardScreen>
      </Modal>
    </View>
  );
}
