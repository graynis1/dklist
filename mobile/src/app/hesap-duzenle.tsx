import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Switch, Alert, Share, Pressable } from "react-native";
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
  const { colors, spacing } = useTheme();
  const { refresh, profile: authProfile } = useAuth();
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
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
    </ScrollView>
  );
}
