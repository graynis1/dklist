import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Platform, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { GoogleButton } from "@/components/GoogleButton";
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/api/config";

const LOGO = require("../../../assets/brand/dklist-mark.png");

WebBrowser.maybeCompleteAuthSession();

/**
 * Ported from the reference's "05 · Giriş Yap" screen, then redone: the
 * "Şifremi Unuttum"/"Kayıt Ol" links used to be static text with no
 * onPress at all (a real, reported gap - a brand-new user had no way to
 * create an account from the app), and there was no visual identity at
 * the top beyond a headline. Added a real hero panel, wired both links to
 * their now-existing screens, and added Google Sign-In.
 */
export default function LoginScreen() {
  const { colors, spacing, isDark } = useTheme();
  const { login, googleLogin, appleLogin } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  async function onApplePress() {
    setError(null);
    setAppleBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) {
        setError("Apple'dan kimlik bilgisi alınamadı.");
        return;
      }
      const result = await appleLogin(credential.identityToken, credential.fullName?.givenName, credential.fullName?.familyName);
      if (result.status === "error") setError(result.message);
    } catch (err) {
      // The user closing the Apple sheet is not an error worth showing.
      if (!(err && typeof err === "object" && "code" in err && err.code === "ERR_REQUEST_CANCELED")) {
        setError("Apple ile giriş başarısız oldu.");
      }
    } finally {
      setAppleBusy(false);
    }
  }
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  const googleConfigured = Boolean(Platform.OS === "ios" ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
  // useIdTokenAuthRequest throws synchronously on Android if androidClientId
  // is undefined (its own internal validation, not a lazy check) - hooks
  // can't be called conditionally, so an unconfigured setup gets a dummy
  // placeholder here instead. onGooglePress's own googleConfigured check
  // is what actually stops a real prompt from ever firing with it.
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || "unconfigured.apps.googleusercontent.com",
    iosClientId: GOOGLE_IOS_CLIENT_ID || "unconfigured.apps.googleusercontent.com",
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
  });

  async function onGooglePress() {
    if (!googleConfigured) {
      Alert.alert(
        "Yapılandırma gerekli",
        "Google ile giriş için önce Google Cloud Console'dan bir OAuth Client ID oluşturup uygulamaya eklenmesi gerekiyor.",
      );
      return;
    }
    setGoogleBusy(true);
    try {
      const result = await promptGoogle();
      if (result.type !== "success") return;
      const idToken = result.params.id_token || result.authentication?.idToken;
      if (!idToken) {
        setError("Google'dan kimlik bilgisi alınamadı.");
        return;
      }
      const loginResult = await googleLogin(idToken);
      if (loginResult.status === "error") setError(loginResult.message);
    } catch {
      setError("Google ile giriş başarısız oldu.");
    } finally {
      setGoogleBusy(false);
    }
  }

  // Fires if the browser sheet already resolved before promptGoogle's own
  // await settles on some Android/Expo Go combinations - harmless no-op
  // otherwise since onGooglePress already handles the direct-await path.
  if (googleResponse?.type === "success" && !googleBusy) {
    const idToken = googleResponse.params.id_token || googleResponse.authentication?.idToken;
    if (idToken) void googleLogin(idToken);
  }

  async function submit() {
    if (!username.trim() || !password) {
      setError("Kullanıcı adı ve şifre gerekli.");
      return;
    }
    if (needsCode && !code.trim()) {
      setError("Doğrulama kodunu gir.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password, needsCode ? code.trim() : undefined);
      if (result.status === "ok") {
        // nothing to do - Stack.Protected flips automatically.
      } else if (result.status === "two_factor_required") {
        setNeedsCode(true);
        setError(needsCode ? "Kod geçersiz veya süresi dolmuş, tekrar dene." : "Bu hesapta iki adımlı doğrulama açık - e-postana gönderilen kodu gir.");
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
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardScreen offset="safeTop">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing["2xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"], paddingBottom: spacing.lg, gap: spacing.md }}>
          <Image source={LOGO} style={{ width: 132, height: 77, tintColor: colors.text }} resizeMode="contain" accessibilityLabel="DKList" />
          <View style={{ alignItems: "center", gap: 4 }}>
            <ThemedText variant="bookTitle" style={{ fontSize: 32, lineHeight: 36, textAlign: "center" }}>
              DKList&apos;e Hoş Geldin
            </ThemedText>
            <ThemedText variant="body" muted style={{ textAlign: "center" }}>Okuduklarını kaydet, yeni kitaplar keşfet.</ThemedText>
          </View>
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

          <Pressable style={{ alignSelf: "flex-end" }} onPress={() => router.push("/sifremi-unuttum")}>
            <ThemedText variant="caption" color={colors.accent}>
              Şifremi Unuttum
            </ThemedText>
          </Pressable>

          {needsCode && (
            <TextField
              label="Doğrulama Kodu"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              placeholder="E-postana gelen kod"
            />
          )}

          {error && (
            <ThemedText variant="caption" color="#c0392b">
              {error}
            </ThemedText>
          )}

          <Button title={submitting ? "Giriş yapılıyor..." : "Giriş Yap"} onPress={submit} disabled={submitting} block style={{ marginTop: spacing.xs }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
            <ThemedText variant="caption" muted>
              veya
            </ThemedText>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ width: "100%", height: 48, opacity: appleBusy ? 0.6 : 1 }}
              onPress={() => {
                if (!appleBusy) void onApplePress();
              }}
            />
          )}

          <GoogleButton onPress={onGooglePress} busy={googleBusy} />
        </View>

        <View style={{ flex: 1, minHeight: spacing.xl }} />

        <Pressable onPress={() => router.push("/kayit-ol")} style={{ alignItems: "center", paddingVertical: spacing["2xl"] }}>
          <ThemedText variant="caption" muted>
            Hesabın yok mu? <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "700" }}>Kayıt Ol</ThemedText>
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
    </SafeAreaView>
  );
}
