import { useState } from "react";
import { View, TextInput, Pressable, type TextInputProps } from "react-native";
import { SearchIcon, XIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";

export function SearchBar({ value, onChangeText, placeholder = "Ara", right, ...rest }: TextInputProps & { value: string; onChangeText: (v: string) => void; right?: React.ReactNode }) {
  const { colors, fontFamily, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 42,
        borderRadius: radius.pill,
        backgroundColor: colors.neutral200,
        borderWidth: 1,
        borderColor: focused ? colors.accent : "transparent",
        paddingLeft: 14,
        paddingRight: 6,
        gap: 8,
      }}
    >
      <SearchIcon size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral500}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text, paddingVertical: 0 }}
        {...rest}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.neutral400, alignItems: "center", justifyContent: "center" }}>
          <XIcon size={14} color="#fff" />
        </Pressable>
      )}
      {right}
    </View>
  );
}
