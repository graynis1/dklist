import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Real customer-reported bug (2026-09-09), reproduced and root-caused via a
 * real browser click test (Playwright), not curl: clicking a profile link
 * for a username containing spaces/non-ASCII characters (real production
 * data - "Gülten Türkel ", "Uzakların Çagrısı ", etc.) 404'd, even though
 * the exact same URL loaded correctly via a hard navigation (curl, or
 * page.goto() bypassing the client router). `generateMetadata` on the
 * profile page even resolved the real user correctly (confirmed: page
 * title showed "@Gülten Türkel | DKList") while the page BODY still
 * rendered "404" - proof the failure is specifically in next/link's
 * client-side prefetch/navigation (its `next-router-state-tree` request
 * header carries the segment value double-encoded for these usernames,
 * confirmed by inspecting the real network request), not the server route
 * itself. Rather than fight Next.js's client router internals, usernames
 * needing escaping fall back to a plain <a> (a real hard navigation,
 * proven correct by the same test) - ordinary ASCII usernames keep next/
 * link's normal fast client-side navigation.
 */
export function ProfileLink({
  username,
  suffix = "",
  children,
  ...rest
}: { username: string; suffix?: string; children: React.ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  const needsHardNav = /[^a-zA-Z0-9_.-]/.test(username);
  const href = `/profil/${encodeURIComponent(username)}${suffix}`;
  if (needsHardNav) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
