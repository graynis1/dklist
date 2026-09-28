import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

const SEX_OPTIONS = [
  { value: "erkek", label: "Erkek" },
  { value: "kadin", label: "Kadın" },
  { value: "belirtmek-istemiyorum", label: "Belirtmek istemiyorum" },
] as const;

export default function RegisterScreen() {
  const { colors, spacing } = useTheme();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [mail, setMail] = useState("");
  const [sex, setSex] = useState<string>("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !surname.trim() || !username.trim() || !mail.trim() || !sex) {
      setError("Tüm alanları doldur.");
      return;
    }
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!d || !m || !y || y < 1900) {
      setError("Geçerli bir doğum tarihi gir.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    const birthDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    setError(null);
    setSubmitting(true);
    try {
      const result = await register({ name: name.trim(), surname: surname.trim(), username: username.trim(), mail: mail.trim(), sex, birthDate, password });
      if (result.status === "error") setError(result.message);
      // status "ok" - Stack.Protected flips automatically, nothing to navigate.
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardScreen offset="safeTop">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing["2xl"], paddingBottom: spacing["2xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: spacing["2xl"], paddingBottom: spacing.lg }}>
          <ThemedText variant="headline" style={{ fontSize: 30, lineHeight: 35 }}>
            Hesap Oluştur
          </ThemedText>
          <ThemedText variant="body" muted style={{ marginTop: spacing.xs }}>
            Bir dakikada hesabını oluştur, okumaya başla.
          </ThemedText>
        </View>

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="İsim" value={name} onChangeText={setName} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Soyisim" value={surname} onChangeText={setSurname} />
            </View>
          </View>

          <TextField label="Kullanıcı Adı" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} placeholder="kullaniciadi" />
          <TextField label="E-posta" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={mail} onChangeText={setMail} />

          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="label" color={colors.textMuted}>
              Cinsiyet
            </ThemedText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {SEX_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSex(opt.value)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: sex === opt.value ? colors.accent : colors.divider,
                  }}
                >
                  <ThemedText variant="caption" color={sex === opt.value ? colors.accent : colors.text}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="label" color={colors.textMuted}>
              Doğum Tarihi
            </ThemedText>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="" placeholder="Gün" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="" placeholder="Ay" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
              </View>
              <View style={{ flex: 1.4 }}>
                <TextField label="" placeholder="Yıl" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
              </View>
            </View>
          </View>

          <TextField
            label="Şifre"
            labelRight={
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>
                  {showPassword ? "Gizle" : "Göster"}
                </ThemedText>
              </Pressable>
            }
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="En az 6 karakter"
          />

          {error && (
            <ThemedText variant="caption" color="#c0392b">
              {error}
            </ThemedText>
          )}

          <Button title={submitting ? "Hesap oluşturuluyor…" : "Üye Ol"} onPress={submit} disabled={submitting} block style={{ marginTop: spacing.xs }} />
        </View>

        <View style={{ flex: 1, minHeight: spacing.xl }} />

        <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <ThemedText variant="caption" muted>
            Zaten üye misin? <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>Giriş Yap</ThemedText>
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
    </SafeAreaView>
  );
}
