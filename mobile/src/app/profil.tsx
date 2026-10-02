import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import {
  ChevronRightIcon,
  HeartIcon,
  ListIcon,
  SettingsIcon,
  AwardIcon,
  TrophyIcon,
  BellIcon,
  ShoppingCartIcon,
  PackageIcon,
  TagIcon,
  FeatherIcon,
  BookPlusIcon,
  ScanBarcodeIcon,
  LibraryIcon,
  GiftIcon,
  UsersIcon,
  SparklesIcon,
  ShieldBanIcon,
  LogOutIcon,
  MessageCircleIcon,
  LibraryBigIcon,
  CalendarHeartIcon,
  ListOrderedIcon,
  NewspaperIcon,
  PlayCircleIcon,
  LifeBuoyIcon,
} from "lucide-react-native";
import { HeaderBack } from "@/components/HeaderBack";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";

type Tile = { icon: typeof HeartIcon; label: string; tint: string; href: Href };

export default function ProfilScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { profile, logout } = useAuth();

  // No manual navigation after logout - Stack.Protected steers back to (auth)
  // automatically once profile becomes null.
  if (!profile) return null;

  const displayName = [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username;

  const tiles: Tile[] = [
    { icon: LibraryIcon, label: "Kitaplığım", tint: "#b68235", href: "/kitapligim" },
    { icon: ListIcon, label: "Listelerim", tint: "#3f7d6b", href: "/listelerim" },
    { icon: HeartIcon, label: "Favorilerim", tint: "#c0504d", href: "/favoriler" },
    { icon: FeatherIcon, label: "Yazarhane", tint: "#7d5411", href: "/yazarhane" },
    { icon: ScanBarcodeIcon, label: "Barkodla Bul", tint: "#2f5d8a", href: "/barkod" },
    { icon: BookPlusIcon, label: "Kitap Ekle", tint: "#5a7d2f", href: "/kitap/yeni" },
    { icon: UsersIcon, label: "Kulüpler", tint: "#6b4c9a", href: "/kulupler" },
    { icon: TagIcon, label: "Askıda Kitap", tint: "#a0602a", href: "/askida-kitap" },
    { icon: AwardIcon, label: "Rozetler", tint: "#b8912f", href: "/rozetler" },
    { icon: TrophyIcon, label: "Puan Tablosu", tint: "#8a6d1f", href: "/puan-tablosu" },
    { icon: GiftIcon, label: "Puan Mağazası", tint: "#9a3f6b", href: "/puan-magazasi" },
    { icon: SparklesIcon, label: "Premium", tint: "#c28d41", href: "/premium" },
  ];

  const groups: { title: string; items: { icon: typeof HeartIcon; label: string; href: Href }[] }[] = [
    {
      title: "Keşfet",
      items: [
        { icon: LibraryBigIcon, label: "Kitaplar", href: "/kitaplar" },
        { icon: CalendarHeartIcon, label: "Ayın Kitabı", href: "/ayin-kitabi" },
        { icon: ListOrderedIcon, label: "Okur Listeleri", href: "/listeler" },
        { icon: NewspaperIcon, label: "Bloglar", href: "/bloglar" },
        { icon: PlayCircleIcon, label: "Videolar", href: "/videolar" },
      ],
    },
    {
      title: "Alışveriş",
      items: [
        { icon: ShoppingCartIcon, label: "Sepetim", href: "/sepetim" },
        { icon: PackageIcon, label: "Siparişlerim", href: "/siparislerim" },
        { icon: TagIcon, label: "İlanlarım", href: "/ilanlarim" },
      ],
    },
    {
      title: "Hesap",
      items: [
        { icon: BellIcon, label: "Bildirimler", href: "/bildirimler" },
        { icon: MessageCircleIcon, label: "Mesajlar", href: "/mesajlar" },
        { icon: SettingsIcon, label: "Hesap Ayarları", href: "/hesap-duzenle" },
        { icon: ShieldBanIcon, label: "Engellenenler", href: "/engellenenler" },
        { icon: LifeBuoyIcon, label: "Yardım ve Destek", href: "/destek" },
      ],
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <HeaderBack />
          <ThemedText variant="display">Menü</ThemedText>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: "/profil/[username]", params: { username: profile.username } })}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}
        >
          <Avatar id={profile.id} name={displayName} imageUrl={profile.image} size={60} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" style={{ fontSize: 19 }} numberOfLines={1}>{displayName}</ThemedText>
            <ThemedText variant="caption" muted numberOfLines={1}>@{profile.username} · Profilini görüntüle</ThemedText>
          </View>
          <ChevronRightIcon color={colors.neutral400} size={20} />
        </Pressable>

        <View>
          <ThemedText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>Kısayollar</ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm }}>
            {tiles.map((t) => (
              <Pressable
                key={t.label}
                onPress={() => router.push(t.href)}
                style={({ pressed }) => ({ width: "48.6%", padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}
              >
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${t.tint}1F`, alignItems: "center", justifyContent: "center" }}>
                  <t.icon size={20} color={t.tint} />
                </View>
                <ThemedText variant="bodySemibold" numberOfLines={1}>{t.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {groups.map((g) => (
          <View key={g.title}>
            <ThemedText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>{g.title}</ThemedText>
            <View style={{ borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...shadow.sm }}>
              {g.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.md, backgroundColor: pressed ? colors.neutral100 : colors.card })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
                    <item.icon color={colors.text} size={17} />
                  </View>
                  <ThemedText variant="body" style={{ flex: 1 }}>{item.label}</ThemedText>
                  <ChevronRightIcon color={colors.neutral400} size={18} />
                  {i < g.items.length - 1 && <View style={{ position: "absolute", left: spacing.md + 34 + spacing.md, right: 0, bottom: 0, height: 1, backgroundColor: colors.divider }} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() =>
            Alert.alert("Çıkış yapılsın mı?", profile.mail ?? undefined, [
              { text: "Vazgeç", style: "cancel" },
              { text: "Çıkış Yap", style: "destructive", onPress: () => logout() },
            ])
          }
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
        >
          <LogOutIcon size={18} color={colors.text} />
          <ThemedText variant="bodySemibold">Çıkış Yap</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
