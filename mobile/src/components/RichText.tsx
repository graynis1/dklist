import { View, Image, Linking, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { mediaUrl } from "@/lib/media";

/**
 * Renders the blog's stored HTML (already sanitized server-side to p/h1-3/
 * strong/em/u/ul/ol/li/a/img/br/blockquote) as native text blocks, keeping
 * headings, bold/italic, links, quotes, lists and inline images - instead of
 * flattening everything to one plain paragraph.
 */

type Block =
  | { kind: "p" | "h1" | "h2" | "h3" | "quote" | "li"; html: string; ordered?: number }
  | { kind: "img"; src: string };

function decode(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function toBlocks(html: string): Block[] {
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ kind: "p" as const, html: p.replace(/\n/g, "<br>") }));
  }
  const blocks: Block[] = [];
  const re = /<(h1|h2|h3|p|div|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*src=["']([^"']+)["'][^>]*>|<(ol|ul)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let olCounter: number | null = null;
  while ((m = re.exec(html))) {
    if (m[4]) {
      olCounter = m[4].toLowerCase() === "ol" ? 0 : null;
      continue;
    }
    if (m[3]) {
      blocks.push({ kind: "img", src: m[3] });
      continue;
    }
    const tag = m[1].toLowerCase();
    const inner = m[2];
    const imgs = [...inner.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((x) => x[1]);
    const text = inner.replace(/<img\b[^>]*>/gi, "");
    if (decode(text.replace(/<[^>]+>/g, "")).trim()) {
      if (tag === "li") {
        blocks.push({ kind: "li", html: text, ordered: olCounter != null ? ++olCounter : undefined });
      } else {
        blocks.push({ kind: tag === "blockquote" ? "quote" : tag === "div" ? "p" : (tag as "p" | "h1" | "h2" | "h3"), html: text });
      }
    }
    imgs.forEach((src) => blocks.push({ kind: "img", src }));
  }
  return blocks.length ? blocks : [{ kind: "p", html }];
}

function Inline({ html, baseStyle }: { html: string; baseStyle: object }) {
  const { colors, fontFamily } = useTheme();
  const parts: React.ReactNode[] = [];
  const re = /<(\/?)(strong|b|em|i|u|a|br)\b([^>]*)>/gi;
  let bold = 0;
  let italic = 0;
  let underline = 0;
  let href: string | null = null;
  let last = 0;
  let key = 0;
  const push = (raw: string) => {
    const txt = decode(raw.replace(/<[^>]+>/g, ""));
    if (!txt) return;
    const link = href;
    parts.push(
      <Text
        key={key++}
        onPress={link ? () => Linking.openURL(link).catch(() => {}) : undefined}
        style={{
          fontFamily: bold ? fontFamily.bodySemibold : fontFamily.bodyRegular,
          fontStyle: italic ? "italic" : "normal",
          textDecorationLine: underline || link ? "underline" : "none",
          color: link ? colors.accent700 : undefined,
        }}
      >
        {txt}
      </Text>,
    );
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    push(html.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "br") parts.push(<Text key={key++}>{"\n"}</Text>);
    else if (tag === "strong" || tag === "b") bold += closing ? -1 : 1;
    else if (tag === "em" || tag === "i") italic += closing ? -1 : 1;
    else if (tag === "u") underline += closing ? -1 : 1;
    else if (tag === "a") href = closing ? null : (m[3].match(/href=["']([^"']+)["']/i)?.[1] ?? null);
  }
  push(html.slice(last));
  return <Text style={baseStyle}>{parts}</Text>;
}

export function RichText({ html }: { html: string }) {
  const { colors, spacing, fontFamily, radius } = useTheme();
  const blocks = toBlocks(html);
  const body = { fontSize: 17, lineHeight: 28, color: colors.text, fontFamily: fontFamily.bodyRegular };

  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((b, i) => {
        if (b.kind === "img") {
          const uri = mediaUrl(b.src);
          return uri ? <Image key={i} source={{ uri }} style={{ width: "100%", aspectRatio: 16 / 10, borderRadius: radius.lg, backgroundColor: colors.surface }} resizeMode="cover" /> : null;
        }
        if (b.kind === "h1" || b.kind === "h2" || b.kind === "h3") {
          const size = b.kind === "h1" ? 26 : b.kind === "h2" ? 23 : 20;
          return <Inline key={i} html={b.html} baseStyle={{ fontSize: size, lineHeight: size * 1.25, color: colors.text, fontFamily: fontFamily.headingSemibold, marginTop: spacing.sm }} />;
        }
        if (b.kind === "quote") {
          return (
            <View key={i} style={{ borderLeftWidth: 4, borderLeftColor: colors.accent, paddingLeft: spacing.md, paddingVertical: 4, backgroundColor: colors.accent100, borderRadius: 4 }}>
              <Inline html={b.html} baseStyle={{ ...body, fontFamily: fontFamily.headingSemiboldItalic, fontSize: 19, color: colors.accent900 }} />
            </View>
          );
        }
        if (b.kind === "li") {
          return (
            <View key={i} style={{ flexDirection: "row", gap: spacing.sm, paddingLeft: spacing.xs }}>
              <Text style={{ ...body, color: colors.accent, width: 20 }}>{b.ordered ? `${b.ordered}.` : "•"}</Text>
              <View style={{ flex: 1 }}>
                <Inline html={b.html} baseStyle={body} />
              </View>
            </View>
          );
        }
        return <Inline key={i} html={b.html} baseStyle={body} />;
      })}
    </View>
  );
}
