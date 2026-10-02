import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Switch, Alert, Share, Pressable, Modal, TextInput } from "react-native";
import { MailCheckIcon, TriangleAlertIcon } from "lucide-react-native";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { deleteAccount, verifyEmail, resendVerificationEmail } from "@/api/auth";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
      {authProfile?.mailVerified === false && (
        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accent100, gap: spacing.sm }}>
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

      <Pressable onPress={onPickAvatar} disabled={avatarUploading} style={{ alignItems: "center", gap: spacing.xs }}>
        <Avatar id={authProfile?.id ?? 0} name={name || "?"} imageUrl={profile.image} size={84} />
        <ThemedText variant="caption" color={colors.accent}>{avatarUploading ? "Yükleniyor…" : "Fotoğrafı Değiştir"}</ThemedText>
      </Pressable>

      <TextField label="Ad" value={name} onChangeText={setName} />
      <TextField label="Soyad" value={surname} onChangeText={setSurname} />
      <TextField label="Şehir" value={livingCity} onChangeText={setLivingCity} />
      <TextField label="Biyografi" value={biyo} onChangeText={setBiyo} multiline style={{ height: 90, textAlignVertical: "top", paddingTop: 10 }} />
      <TextField label="Yeni Şifre (opsiyonel)" value={password} onChangeText={setPassword} secureTextEntry placeholder="Değiştirmek istemiyorsan boş bırak" />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodySemibold">Gizli Profil</ThemedText>
          <ThemedText variant="caption" muted>Takipçin olmayanlar kitaplığını/rozetlerini göremez.</ThemedText>
        </View>
        <Switch value={privacy} onValueChange={setPrivacy} trackColor={{ true: colors.accent }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodySemibold">İki Adımlı Doğrulama</ThemedText>
          <ThemedText variant="caption" muted>Girişte e-posta koduyla ek doğrulama iste.</ThemedText>
        </View>
        <Switch value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} trackColor={{ true: colors.accent }} />
      </View>

      <Button title="Kaydet" onPress={onSave} disabled={saving} block />

      <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md }}>
        <Button title="Engellenen Kullanıcılar" variant="ghost" onPress={() => router.push("/engellenenler")} />
        <Button title="Verilerimi İndir (KVKK)" variant="ghost" onPress={onExportData} />
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: "#c0504d55" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <TriangleAlertIcon size={18} color="#c0504d" />
          <ThemedText variant="bodySemibold" color="#c0504d">Tehlikeli Bölge</ThemedText>
        </View>
        <ThemedText variant="caption" muted>Hesabını sildiğinde kitaplığın, yorumların, gönderilerin ve mesajların kalıcı olarak silinir. Bu işlem geri alınamaz.</ThemedText>
        <Pressable onPress={() => { setDeleteConfirm(""); setShowDelete(true); }} style={({ pressed }) => ({ alignItems: "center", paddingVertical: 11, borderRadius: radius.md, backgroundColor: pressed ? "#c0504d22" : "#c0504d14" })}>
          <ThemedText variant="bodySemibold" color="#c0504d">Hesabımı Sil</ThemedText>
        </Pressable>
      </View>
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
