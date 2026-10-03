import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
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
  Building2Icon,
  type LucideIcon,
} from "lucide-react-native";
import { HeaderBack } from "@/components/HeaderBack";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Group, Row, IconTile } from "@/components/ui";

const SHORTCUTS: { icon: LucideIcon; label: string; href: Href }[] = [
  { icon: LibraryIcon, label: "Kitaplığım", href: "/kitapligim" },
  { icon: ListIcon, label: "Listelerim", href: "/listelerim" },
  { icon: HeartIcon, label: "Favorilerim", href: "/favoriler" },
  { icon: FeatherIcon, label: "Yazarhane", href: "/yazarhane" },
  { icon: UsersIcon, label: "Kulüpler", href: "/kulupler" },
  { icon: TagIcon, label: "Askıda Kitap", href: "/askida-kitap" },
];

const GROUPS: { title: string; items: { icon: LucideIcon; label: string; href: Href; subtitle?: string }[] }[] = [
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
    title: "Topluluk",
    items: [
      { icon: AwardIcon, label: "Rozetler", href: "/rozetler" },
      { icon: TrophyIcon, label: "Puan Tablosu", href: "/puan-tablosu" },
      { icon: GiftIcon, label: "Puan Mağazası", href: "/puan-magazasi" },
      { icon: SparklesIcon, label: "Premium", href: "/premium", subtitle: "Reklamsız, ayrıcalıklı DKList" },
    ],
  },
  {
    title: "Araçlar",
    items: [
      { icon: ScanBarcodeIcon, label: "Barkodla Kitap Bul", href: "/barkod" },
      { icon: BookPlusIcon, label: "Kitap Ekle", href: "/kitap/yeni" },
      { icon: Building2Icon, label: "Yayınevi Başvurusu", href: "/yayinevi-basvuru", subtitle: "Yayınevi hesabı ile kataloğa kitap ekleyin" },
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

export default function ProfilScreen() {
  const { colors, spacing, radius } = useTheme();
  const { profile, logout } = useAuth();

  // No manual navigation after logout - Stack.Protected steers back to (auth)
  // automatically once profile becomes null.
  if (!profile) return null;

  const displayName = [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username;

  function confirmLogout() {
    Alert.alert("Çıkış yapılsın mı?", profile?.mail ?? undefined, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, height: 56 }}>
        <HeaderBack />
        <ThemedText variant="display" style={{ flex: 1 }}>Menü</ThemedText>
        <Pressable onPress={() => router.push("/hesap-duzenle")} hitSlop={8} accessibilityLabel="Hesap ayarları" style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
          <SettingsIcon size={23} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing["3xl"], gap: spacing.xl }}>
        {/* Profile */}
        <Pressable
          onPress={() => router.push({ pathname: "/profil/[username]", params: { username: profile.username } })}
          style={({ pressed }) => ({ marginHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card })}
        >
          <Avatar id={profile.id} name={displayName} imageUrl={profile.image} size={56} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" style={{ fontSize: 18 }} numberOfLines={1}>{displayName}</ThemedText>
            <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 13.5 }}>Profilini görüntüle</ThemedText>
          </View>
          <ChevronRightIcon color={colors.neutral400} size={20} />
        </Pressable>

        {/* Shortcuts */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {SHORTCUTS.map((t) => (
            <Pressable
              key={t.label}
              onPress={() => router.push(t.href)}
              style={({ pressed }) => ({ width: "31.8%", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: "center", gap: 8, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card })}
            >
              <IconTile icon={t.icon} size={40} tone="accent" />
              <ThemedText variant="body" numberOfLines={1} style={{ fontSize: 13, fontWeight: "500" }}>{t.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {GROUPS.map((g) => (
          <Group key={g.title} title={g.title}>
            {g.items.map((item) => (
              <Row key={item.label} icon={item.icon} title={item.label} subtitle={item.subtitle} onPress={() => router.push(item.href)} />
            ))}
          </Group>
        ))}

        <Group>
          <Row icon={LogOutIcon} title="Çıkış Yap" destructive chevron={false} onPress={confirmLogout} />
        </Group>

        <ThemedText variant="caption" muted style={{ textAlign: "center" }}>
          DKList {Constants.expoConfig?.version ?? ""}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}
