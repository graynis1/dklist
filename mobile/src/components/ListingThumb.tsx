import { View, Image, type DimensionValue } from "react-native";
import { BookOpenIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { BookCover } from "@/components/BookCover";
import { mediaUrl } from "@/lib/media";

/**
 * Askıda Kitap listing image: the seller's photo, else the linked catalog
 * book's cover on a soft backdrop, else a neutral book mark - never the
 * old peach box with a price-tag icon.
 */
export function ListingThumb({ image, bookId, bookHasImage, title, width = "100%", height, radius = 0 }: { image: string | null; bookId?: number | null; bookHasImage?: boolean; title: string; width?: DimensionValue; height: number; radius?: number }) {
  const { colors } = useTheme();
  const src = mediaUrl(image);
  if (src) return <Image source={{ uri: src }} style={{ width, height, borderRadius: radius, backgroundColor: colors.surface }} resizeMode="cover" />;
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {bookId ? (
        <View style={{ borderRadius: 3, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
          <BookCover id={bookId} title={title} width={Math.round(height * 0.5)} height={Math.round(height * 0.74)} hasImage={bookHasImage} />
        </View>
      ) : (
        <BookOpenIcon size={Math.max(18, height * 0.2)} color={colors.neutral400} strokeWidth={1.6} />
      )}
    </View>
  );
}
