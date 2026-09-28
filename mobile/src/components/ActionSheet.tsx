import { useEffect, useState } from "react";
import { ActionSheetIOS, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

export interface ActionSheetOption {
  text: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface SheetRequest {
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelText?: string;
}

let present: ((req: SheetRequest) => void) | null = null;

/**
 * Option menus (long-press, "⋯"). iOS gets the native action sheet. Android
 * gets a bottom sheet: Android's Alert shows at most three buttons and
 * silently drops the rest, which broke menus with more options.
 */
export function showActionSheet(req: SheetRequest) {
  const cancelText = req.cancelText ?? "Vazgeç";
  if (Platform.OS === "ios") {
    const labels = [...req.options.map((o) => o.text), cancelText];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: req.title,
        message: req.message,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: req.options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0),
      },
      (index) => {
        if (index < req.options.length) req.options[index].onPress?.();
      },
    );
    return;
  }
  present?.({ ...req, cancelText });
}

/** Mounted once at the app root; renders the Android sheet. */
export function ActionSheetHost() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState<SheetRequest | null>(null);

  useEffect(() => {
    present = setReq;
    return () => {
      present = null;
    };
  }, []);

  const close = () => setReq(null);

  return (
    <Modal visible={req != null} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
      {req && (
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, 24) + spacing.lg }}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral300, marginBottom: spacing.sm }} />
          {(req.title || req.message) && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 2 }}>
              {req.title ? <ThemedText variant="title" numberOfLines={2}>{req.title}</ThemedText> : null}
              {req.message ? <ThemedText variant="caption" muted>{req.message}</ThemedText> : null}
            </View>
          )}
          {req.options.map((o, i) => (
            <Pressable
              key={`${o.text}-${i}`}
              onPress={() => {
                close();
                o.onPress?.();
              }}
              style={({ pressed }) => ({ paddingVertical: 15, paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.neutral200 : "transparent", borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider })}
            >
              <ThemedText variant="body" color={o.destructive ? "#c0392b" : colors.text} style={{ fontSize: 16 }}>{o.text}</ThemedText>
            </Pressable>
          ))}
          <Pressable
            onPress={close}
            style={({ pressed }) => ({ marginHorizontal: spacing.md, marginTop: spacing.sm, paddingVertical: 13, borderRadius: radius.lg, alignItems: "center", backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
          >
            <ThemedText variant="bodySemibold">{req.cancelText}</ThemedText>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}
