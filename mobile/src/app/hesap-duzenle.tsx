import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Switch, Alert, Share, Pressable, Modal, TextInput } from "react-native";
import { MailCheckIcon, CameraIcon, LockIcon, ShieldCheckIcon, ShieldBanIcon, DownloadIcon, Trash2Icon, type LucideIcon } from "lucide-react-native";
import { Group, Row, IconTile } from "@/components/ui";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { deleteAccount, verifyEmail, resendVerificationEmail } from "@/api/auth";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { getEditableProfile, updateAccount, uploadAvatar, getDataExport, type EditableProfile } from "@/api/accountEdit";

/**
 * Hesap düzenle - name/surname/bio/city/password/privacy/2FA. `sex` and
 * `birthDate` are required by the backend's `updateProfile()` (matches
 * v1's own validation) but aren't given their own picker UI this pass -
 * loaded from the real profile and sent back unchanged, not silently
 * dropped or faked.
 */
export default function HesapDuzenleScreen() {
  const { colors, spacing, radius } = useTheme();
  const { refresh, logout, profile: authProfile } = useAuth();
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [biyo, setBiyo] = useState("");
  const [livingCity, setLivingCity] = useState("");
  const [password, setPassword] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getEditableProfile();
    if (ignore?.current) return;
    setProfile(result.profile);
    setName(result.profile.name);
    setSurname(result.profile.surname);
    setBiyo(result.profile.biyo ?? "");
    setLivingCity(result.profile.livingCity ?? "");
    setPrivacy(result.profile.privacy);
    setTwoFactorEnabled(result.profile.twoFactorEnabled);
  }, []);

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

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const result = await updateAccount({
        name,
        surname,
        sex: profile.sex,
        birthDate: profile.birthDate,
        biyo,
        livingCity,
        password: password || undefined,
        privacy,
        twoFactorEnabled,
      });
      setPassword("");
      if (result.recoveryCodes) {
        Alert.alert("Kurtarma Kodları", result.recoveryCodes.join("\n"), [{ text: "Kaydettim" }]);
      } else {
        Alert.alert("Kaydedildi", "Hesap bilgilerin güncellendi.");
      }
      await refresh();
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function onExportData() {
    try {
      const result = await getDataExport();
      await Share.share({ message: JSON.stringify(result.data, null, 2), title: "dklist-verilerim.json" });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Verileriniz alınamadı.");
    }
  }

  async function onVerify() {
    if (verifyCode.trim().length < 4) return;
    setVerifying(true);
    try {
      await verifyEmail(verifyCode.trim());
      setVerifyCode("");
      await refresh();
      Alert.alert("Doğrulandı", "E-posta adresin doğrulandı.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kod doğrulanamadı.");
    } finally {
      setVerifying(false);
    }
  }

  async function onResend() {
    try {
      const r = await resendVerificationEmail();
      Alert.alert("Kod gönderildi", r.mailSent ? "Doğrulama kodu e-posta adresine gönderildi." : "Kod oluşturuldu ancak e-posta gönderilemedi, biraz sonra tekrar dene.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kod gönderilemedi.");
    }
  }

  async function onDeleteAccount() {
    if (!authProfile || deleteConfirm.trim() !== authProfile.username) return;
    setDeleting(true);
    try {
      await deleteAccount(deleteConfirm.trim());
      setShowDelete(false);
      await logout();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Hesap silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  async function onPickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Fotoğraf değiştirmek için galeri izni vermelisin.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      await uploadAvatar({ uri: asset.uri, name: asset.fileName ?? `avatar-${Date.now()}.jpg`, type: asset.mimeType ?? "image/jpeg" });
      await refresh();
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.xl, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
      {authProfile?.mailVerified === false && (
        <View style={{ marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accent100, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <MailCheckIcon size={20} color={colors.accent700} />
            <ThemedText variant="bodySemibold" color={colors.accent800} style={{ flex: 1 }}>E-postanı doğrula</ThemedText>
          </View>
          <ThemedText variant="caption" color={colors.accent800}>
            {authProfile.mail ? `${authProfile.mail} adresine gönderilen kodu gir.` : "E-posta adresine gönderilen kodu gir."}
          </ThemedText>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="Doğrulama kodu"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="number-pad"
              style={{ flex: 1, height: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.card, color: colors.text, fontSize: 16, letterSpacing: 2 }}
            />
            <Button title={verifying ? "…" : "Doğrula"} onPress={onVerify} disabled={verifying || verifyCode.trim().length < 4} />
          </View>
          <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: "700" }} onPress={onResend}>Kodu tekrar gönder</ThemedText>
        </View>
      )}

      <Pressable onPress={onPickAvatar} disabled={avatarUploading} style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
        <View>
          <Avatar id={authProfile?.id ?? 0} name={name || "?"} imageUrl={profile.image} size={92} />
          <View style={{ position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
            {avatarUploading ? <ActivityIndicator size="small" color="#fff" /> : <CameraIcon size={14} color="#fff" />}
          </View>
        </View>
        <ThemedText variant="body" color={colors.accent700} style={{ fontSize: 14, fontWeight: "600" }}>Fotoğrafı değiştir</ThemedText>
      </Pressable>

      <Group title="Profil">
        <FieldRow label="Ad" value={name} onChangeText={setName} />
        <FieldRow label="Soyad" value={surname} onChangeText={setSurname} />
        <FieldRow label="Şehir" value={livingCity} onChangeText={setLivingCity} placeholder="Nerede yaşıyorsun?" />
        <FieldRow label="Biyografi" value={biyo} onChangeText={setBiyo} placeholder="Kendinden ve okuma zevkinden bahset" multiline />
      </Group>

      <Group title="Gizlilik ve güvenlik">
        <SwitchRow icon={LockIcon} title="Gizli profil" subtitle="Takipçin olmayanlar kitaplığını ve rozetlerini göremez" value={privacy} onChange={setPrivacy} />
        <SwitchRow icon={ShieldCheckIcon} title="İki adımlı doğrulama" subtitle="Girişte e-posta koduyla ek doğrulama" value={twoFactorEnabled} onChange={setTwoFactorEnabled} />
        <FieldRow label="Yeni şifre" value={password} onChangeText={setPassword} placeholder="Değiştirmeyeceksen boş bırak" secureTextEntry />
      </Group>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Button title={saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"} onPress={onSave} disabled={saving} block />
      </View>

      <Group title="Veriler">
        <Row icon={ShieldBanIcon} title="Engellenen kullanıcılar" onPress={() => router.push("/engellenenler")} />
        <Row icon={DownloadIcon} title="Verilerimi indir" subtitle="KVKK kapsamında tüm verilerinin kopyası" onPress={onExportData} />
      </Group>

      <Group footer="Hesabını sildiğinde kitaplığın, yorumların, gönderilerin ve mesajların kalıcı olarak silinir. Bu işlem geri alınamaz.">
        <Row icon={Trash2Icon} title="Hesabımı sil" destructive chevron={false} onPress={() => { setDeleteConfirm(""); setShowDelete(true); }} />
      </Group>
    </ScrollView>

    <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
      <KeyboardScreen style={{ flex: 1 }}>
        <Pressable onPress={() => setShowDelete(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md }}>
            <ThemedText variant="title" style={{ fontSize: 19 }}>Hesabı kalıcı olarak sil</ThemedText>
            <ThemedText variant="body" muted>
              Onaylamak için kullanıcı adını yaz: <ThemedText variant="bodySemibold">{authProfile?.username}</ThemedText>
            </ThemedText>
            <TextInput
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder={authProfile?.username}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ height: 46, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.divider, color: colors.text, fontSize: 16 }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button title="Vazgeç" variant="secondary" onPress={() => setShowDelete(false)} block /></View>
              <Pressable
                onPress={onDeleteAccount}
                disabled={deleting || deleteConfirm.trim() !== authProfile?.username}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: "#c0504d", opacity: deleting || deleteConfirm.trim() !== authProfile?.username ? 0.45 : 1 }}
              >
                {deleting ? <ActivityIndicator color="#fff" /> : <ThemedText variant="bodySemibold" color="#fff">Sil</ThemedText>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardScreen>
    </Modal>
    </KeyboardScreen>
  );
}

/** Label-left, input-right row inside a Group (iOS settings style). */
function FieldRow({ label, value, onChangeText, placeholder, multiline, secureTextEntry }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; secureTextEntry?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: multiline ? "flex-start" : "center", paddingHorizontal: spacing.lg, minHeight: 52, paddingVertical: multiline ? 12 : 0, gap: spacing.md }}>
      <ThemedText variant="body" style={{ width: 92, fontSize: 15, paddingTop: multiline ? 2 : 0 }}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral500}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text, paddingVertical: multiline ? 0 : 14, minHeight: multiline ? 72 : undefined, textAlignVertical: multiline ? "top" : "center" }}
      />
    </View>
  );
}

function SwitchRow({ icon, title, subtitle, value, onChange }: { icon: LucideIcon; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, minHeight: 56 }}>
      <IconTile icon={icon} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" style={{ fontSize: 15.5 }}>{title}</ThemedText>
        {subtitle ? <ThemedText variant="caption" muted>{subtitle}</ThemedText> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.neutral300 }} thumbColor="#fff" />
    </View>
  );
}
