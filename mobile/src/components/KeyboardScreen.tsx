import { useContext } from "react";
import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderHeightContext } from "expo-router/react-navigation";

/**
 * KeyboardAvoidingView measures itself relative to its parent, not the
 * screen, so on iOS it must be told how far down the screen it starts -
 * otherwise the keyboard covers the bottom of the input under a native
 * header. `offset="header"` (default) uses the real header height of the
 * current stack screen; `"safeTop"` is for header-less screens wrapped in a
 * top SafeAreaView. Android resizes the window itself (adjustResize), so
 * no behavior is applied there.
 */
export function KeyboardScreen({
  children,
  style,
  offset = "header",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: "header" | "safeTop" | number;
}) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const verticalOffset = offset === "header" ? headerHeight : offset === "safeTop" ? insets.top : offset;

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? verticalOffset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
