import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { requestPasswordReset } from "@/api/auth";

export default function ForgotPasswordScreen() {
  const { colors, spacing } = useTheme();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!target.trim()) {
      setError("Kullanıcı adı veya e-posta gir.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(target.trim());
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push({ pathname: "/sifre-sifirla", params: { userId: String(result.userId), devResetCode: result.devResetCode ?? "" } });
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardScreen offset="safeTop">
      <View style={{ flex: 1, paddingHorizontal: spacing["2xl"], paddingTop: spacing["3xl"], gap: spacing.md }}>
        <ThemedText variant="headline" style={{ fontSize: 30 }}>
          Şifremi Unuttum
        </ThemedText>
        <ThemedText variant="body" muted>
          Kullanıcı adını veya e-postanı gir, sana bir sıfırlama kodu gönderelim.
        </ThemedText>

        <TextField label="Kullanıcı Adı veya E-posta" autoCapitalize="none" autoCorrect={false} value={target} onChangeText={setTarget} />

        {error && (
          <ThemedText variant="caption" color="#c0392b">
            {error}
          </ThemedText>
        )}

        <Button title={submitting ? "Gönderiliyor…" : "Sıfırlama Kodu Gönder"} onPress={submit} disabled={submitting} block />
      </View>
    </KeyboardScreen>
    </SafeAreaView>
  );
}
