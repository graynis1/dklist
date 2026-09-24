import { useState, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

export function TextField({
  label,
  labelRight,
  style,
  ...rest
}: TextInputProps & { label: string; labelRight?: ReactNode }) {
  const { colors, fontFamily, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <ThemedText variant="caption" muted>
          {label}
        </ThemedText>
        {labelRight}
      </View>
      <TextInput
        placeholderTextColor={colors.neutral500}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          {
            height: 48,
            borderWidth: 1,
            borderColor: focused ? colors.accent : colors.divider,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            fontSize: 15,
            fontFamily: fontFamily.bodyRegular,
            color: colors.text,
            backgroundColor: colors.card,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
