import { Text, View, StyleSheet } from "react-native";

/**
 * Placeholder root screen - infrastructure phase only, no real screens
 * built yet (see mobile/README.md). `src/api/`+`src/auth/` are wired and
 * verified against the real backend; nothing here calls them yet on
 * purpose - that's the next phase, not this one.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DKList</Text>
      <Text style={styles.subtitle}>Mobil altyapı hazır - ekranlar henüz yok.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});
