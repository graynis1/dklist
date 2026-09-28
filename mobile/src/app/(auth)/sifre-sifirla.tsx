import { useState } from "react";
import { View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { confirmPasswordReset, resendResetCode } from "@/api/auth";

export default function ResetPasswordScreen() {
  const { colors, spacing } = useTheme();
  const { userId, devResetCode } = useLocalSearchParams<{ userId: string; devResetCode?: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState<{ mailSent: boolean; devNewPassword?: string } | null>(null);

  async function submit() {
    if (!code.trim()) {
      setError("Sıfırlama kodunu gir.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await confirmPasswordReset(Number(userId), code.trim());
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDone({ mailSent: result.mailSent, devNewPassword: result.devNewPassword });
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      const result = await resendResetCode(Number(userId));
      if (result.status === "ok") {
        Alert.alert("Gönderildi", result.mailSent ? "Yeni kod e-postana gönderildi." : `Geliştirme kodu: ${result.devResetCode}`);
      }
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing["2xl"], paddingTop: spacing["3xl"], gap: spacing.md }}>
        <ThemedText variant="headline" style={{ fontSize: 30 }}>
          Şifre Sıfırlandı
        </ThemedText>
        {done.mailSent ? (
          <ThemedText variant="body" muted>
            Yeni şifren e-posta adresine gönderildi.
          </ThemedText>
        ) : (
          <ThemedText variant="body">
            Geliştirme modunda yeni şifren: <ThemedText variant="bodySemibold">{done.devNewPassword}</ThemedText>
          </ThemedText>
        )}
        <Button title="Giriş Yap" onPress={() => router.replace("/login")} block />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardScreen offset="safeTop">
      <View style={{ flex: 1, paddingHorizontal: spacing["2xl"], paddingTop: spacing["3xl"], gap: spacing.md }}>
        <ThemedText variant="headline" style={{ fontSize: 30 }}>
          Şifre Sıfırlama
        </ThemedText>
        {devResetCode ? (
          <ThemedText variant="body" muted>
            Geliştirme modunda sıfırlama kodun: <ThemedText variant="bodySemibold">{devResetCode}</ThemedText>
          </ThemedText>
        ) : (
          <ThemedText variant="body" muted>
            Sıfırlama kodu e-posta adresine gönderildi.
          </ThemedText>
        )}

        <TextField label="Sıfırlama Kodu" autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={setCode} maxLength={5} />

        {error && (
          <ThemedText variant="caption" color="#c0392b">
            {error}
          </ThemedText>
        )}

        <Button title={submitting ? "Sıfırlanıyor…" : "Şifreyi Sıfırla"} onPress={submit} disabled={submitting} block />
        {!devResetCode && <Button title={resending ? "Gönderiliyor…" : "Kodu Tekrar Gönder"} variant="ghost" onPress={resend} disabled={resending} block />}
      </View>
    </KeyboardScreen>
    </SafeAreaView>
  );
}
