import { useState } from "react";
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

/**
 * Ported from the reference's "05 · Giriş Yap" screen. One real deviation
 * from it, deliberate: the mockup labels the first field "E-posta", but
 * the actual backend (`verifyCredentials()`, shared with the web login
 * form) takes a username, not an email - checked the real web
 * `login-form.tsx` to confirm before writing this, rather than trusting a
 * generic mockup label over the real API contract.
 */
export default function LoginScreen() {
  const { colors, spacing } = useTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setError("Kullanıcı adı ve şifre gerekli.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      // No manual navigation on success - RootNavigator's Stack.Protected
      // guards flip automatically once AuthContext's profile updates, and
      // Expo Router steers here-to-(tabs) itself.
      if (result.status === "ok") {
        // nothing to do
      } else if (result.status === "two_factor_required") {
        setError("Bu hesapta iki adımlı doğrulama açık - mobil uygulama henüz bu adımı desteklemiyor, lütfen web'den giriş yap.");
      } else if (result.status === "suspended") {
        setError("Hesabınız geçici olarak askıya alındı.");
      } else {
        setError(result.message ?? "Kullanıcı adı veya şifre hatalı.");
      }
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing["2xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: spacing["3xl"], paddingBottom: spacing.lg }}>
          <ThemedText variant="headline" style={{ fontSize: 32, lineHeight: 37 }}>
            DKList&apos;e{"\n"}Hoş Geldin
          </ThemedText>
        </View>

        <View style={{ gap: spacing.md }}>
          <TextField
            label="Kullanıcı Adı"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="kullaniciadi"
          />

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
            placeholder="Şifreni gir"
          />

          <Pressable style={{ alignSelf: "flex-end" }}>
            <ThemedText variant="caption" color={colors.accent}>
              Şifremi Unuttum
            </ThemedText>
          </Pressable>

          {error && (
            <ThemedText variant="caption" color="#c0392b">
              {error}
            </ThemedText>
          )}

          <Button title={submitting ? "Giriş yapılıyor..." : "Giriş Yap"} onPress={submit} disabled={submitting} block style={{ marginTop: spacing.xs }} />
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ alignItems: "center", paddingVertical: spacing["2xl"] }}>
          <ThemedText variant="caption" muted>
            Hesabın yok mu? <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>Kayıt Ol</ThemedText>
          </ThemedText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
