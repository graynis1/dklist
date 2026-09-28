import { Platform, Share } from "react-native";

/**
 * iOS's share sheet takes the link as a separate `url` (and shows a proper
 * link preview for it), so embedding it in `message` too would duplicate
 * it. Android has no `url` field - the link has to be part of the text.
 */
export function shareLink(text: string, url: string) {
  const content = Platform.OS === "ios" ? { message: text || undefined, url } : { message: text ? `${text}\n${url}` : url };
  return Share.share(content as { message: string; url?: string }).catch(() => {});
}
