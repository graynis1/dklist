import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Switch, Alert } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { getEditableProfile, updateAccount, type EditableProfile } from "@/api/accountEdit";

/**
 * Hesap düzenle - name/surname/bio/city/password/privacy/2FA. `sex` and
 * `birthDate` are required by the backend's `updateProfile()` (matches
 * v1's own validation) but aren't given their own picker UI this pass -
 * loaded from the real profile and sent back unchanged, not silently
 * dropped or faked.
 */
export default function HesapDuzenleScreen() {
  const { colors, spacing } = useTheme();
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
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
    </ScrollView>
  );
}
