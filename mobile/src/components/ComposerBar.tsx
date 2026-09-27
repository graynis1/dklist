import { View, TextInput, Pressable, ActivityIndicator, type TextInputProps } from "react-native";
import { SendHorizontalIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";

/** Messenger-style composer: optional leading accessory buttons, a pill
 * input that grows with multi-line text, and a round send button that only
 * lights up once there is something to send. */
export function ComposerBar({
  value,
  onChangeText,
  onSend,
  sending,
  canSend,
  placeholder = "Mesaj yaz…",
  leading,
  bordered = true,
  ...rest
}: TextInputProps & {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  sending?: boolean;
  canSend?: boolean;
  leading?: React.ReactNode;
  bordered?: boolean;
}) {
  const { colors, fontFamily, spacing } = useTheme();
  const enabled = (canSend ?? value.trim().length > 0) && !sending;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.xs,
        paddingHorizontal: bordered ? spacing.sm : 0,
        paddingVertical: bordered ? spacing.sm : 0,
        backgroundColor: bordered ? colors.card : "transparent",
        borderTopWidth: bordered ? 1 : 0,
        borderTopColor: colors.divider,
      }}
    >
      {leading}
      <View
        style={{
          flex: 1,
          minHeight: 40,
          maxHeight: 120,
          borderRadius: 20,
          backgroundColor: colors.neutral200,
          paddingHorizontal: 14,
          justifyContent: "center",
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral500}
          multiline
          style={{ fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text, paddingVertical: 9, textAlignVertical: "center" }}
          {...rest}
        />
      </View>
      <Pressable
        onPress={onSend}
        disabled={!enabled}
        hitSlop={6}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: enabled ? (pressed ? colors.accent700 : colors.accent) : colors.neutral200,
        })}
      >
        {sending ? <ActivityIndicator size="small" color="#fff" /> : <SendHorizontalIcon size={19} color={enabled ? "#fff" : colors.neutral500} />}
      </Pressable>
    </View>
  );
}

export function ComposerIconButton({ icon, onPress, active }: { icon: React.ReactNode; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? `${colors.accent}24` : pressed ? colors.neutral200 : "transparent",
      })}
    >
      {icon}
    </Pressable>
  );
}
