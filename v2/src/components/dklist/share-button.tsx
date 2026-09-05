"use client";

import { useState } from "react";
import { Share2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { awardSharePointsAction } from "@/actions/points";

/**
 * v1's ShareComponent.js - a generic external social-share popover (Facebook/
 * Twitter/LinkedIn/WhatsApp), used on book pages, blog posts, Askıda Kitap
 * listings, and individual comments.
 *
 * Redesigned 2026-08-24 - the original trigger was a bare "↗" glyph (easy to
 * miss entirely) and the popover was four plain text labels with no icons or
 * brand color, both flagged directly by the maintainer as looking barely
 * functional. Real brand-colored icon buttons now, matching this app's own
 * popover styling (ring/shadow/rounded, same as DropdownMenuContent) instead
 * of a bare bordered box.
 *
 * `url` defaults to the current page's URL (computed at click-time, not
 * render-time, so this is safe to use in a server-rendered tree without any
 * SSR/window guard). `content` is the share text (Twitter's tweet text,
 * mobile-share-sheet title) - callers pass something meaningful (a book
 * title, a comment excerpt), matching what v1's callers each passed.
 *
 * `pointsKey`, when passed, awards the customer's requested "paylaşımlar da
 * puan kazandırsın" points once per user/entity/day (fire-and-forget - a
 * failed/blocked points call should never interrupt the actual share).
 */
export function ShareButton({
  content,
  url,
  pointsKey,
  quote,
  size = "default",
}: {
  content: string;
  url?: string;
  pointsKey?: string;
  /**
   * Real bug found via customer report: sharing a comment/quote on
   * Facebook/WhatsApp only ever shared the entity page's own URL, so the
   * preview card showed that page's generic OG title/description (e.g.
   * "DKList (Kitap Kulübü) | DKList") with zero trace of the actual
   * comment - `content` only reaches Twitter's intent (which accepts
   * text directly) and the native share sheet, never a Facebook/WhatsApp
   * preview, which is generated purely from the target URL's own OG
   * tags. When `quote` is passed, it's appended as an `alinti` query
   * param on the shared URL (computed here, at click-time, not at
   * render-time, for the same SSR-safety reason resolveUrl() already
   * avoids `window` at render) - the entity page's own generateMetadata
   * reads it and swaps its description for the real quoted text, so the
   * preview actually reflects what's being shared.
   */
  quote?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);

  function resolveUrl() {
    if (url) {
      if (typeof window === "undefined" || /^https?:\/\//.test(url)) return url;
      return `${window.location.origin}${url}`;
    }
    if (typeof window === "undefined") return "";
    if (!quote) return window.location.href;
    const base = `${window.location.origin}${window.location.pathname}`;
    const excerpt = quote.length > 200 ? `${quote.slice(0, 200)}...` : quote;
    return `${base}?alinti=${encodeURIComponent(excerpt)}`;
  }

  function trackShare() {
    if (pointsKey) awardSharePointsAction(pointsKey).catch(() => {});
  }

  function shareFacebook() {
    trackShare();
    const shareUrl = resolveUrl();
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: content, url: shareUrl }).catch(() => {});
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
    }
    setOpen(false);
  }

  function shareTwitter() {
    trackShare();
    const shareUrl = resolveUrl();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
    );
    setOpen(false);
  }

  function shareLinkedin() {
    trackShare();
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(resolveUrl())}`, "_blank");
    setOpen(false);
  }

  function shareWhatsapp() {
    trackShare();
    // Just the link, not link+text - WhatsApp already builds its own preview
    // card from the page's Open Graph tags, so adding the text again would
    // show the same content twice (once as a plain message, once under the
    // card), matching a real fix already made in v1's own ShareComponent.
    window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(resolveUrl())}`, "_blank");
    setOpen(false);
  }

  async function copyLink() {
    trackShare();
    try {
      await navigator.clipboard.writeText(resolveUrl());
    } catch {
      // clipboard API unavailable (insecure context/permissions) - the link
      // is still visible via the browser's own address bar, not a dead end.
    }
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Paylaş"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
          size === "sm" && "px-2 py-1 text-xs",
        )}
      >
        <Share2Icon className={size === "sm" ? "size-3.5" : "size-4"} />
        Paylaş
      </button>
      {open && (
        <>
          {/* click-outside-to-close scrim, same pattern used across this app's other popovers */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-1 rounded-lg bg-popover p-2 text-sm ring-1 ring-foreground/10 shadow-md">
            <ShareRow onClick={shareWhatsapp} label="WhatsApp" bg="#25D366" icon={<WhatsappIcon />} />
            <ShareRow onClick={shareFacebook} label="Facebook" bg="#1877F2" icon={<FacebookIcon />} />
            <ShareRow onClick={shareTwitter} label="X (Twitter)" bg="#000000" icon={<XIcon />} />
            <ShareRow onClick={shareLinkedin} label="LinkedIn" bg="#0A66C2" icon={<LinkedinIcon />} />
            <div className="my-1 h-px bg-border" />
            <ShareRow onClick={copyLink} label="Bağlantıyı kopyala" bg="var(--secondary)" fg="var(--secondary-foreground)" icon={<LinkIcon />} />
          </div>
        </>
      )}
    </div>
  );
}

function ShareRow({
  onClick,
  label,
  bg,
  fg = "#fff",
  icon,
}: {
  onClick: () => void;
  label: string;
  bg: string;
  fg?: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bg, color: fg }}
      >
        {icon}
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </button>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10.4 9 10 8 9.8 7.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.2-.1-.4-.2z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5-1.3c1.4.8 3.1 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.6 0-3.2-.4-4.5-1.3l-.3-.2-3 .8.8-2.9-.2-.3C4 15 3.5 13.5 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.6-8.5 8.6z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.3l8.2-9.3L1 2h7.2l5 6.6L18.9 2zm-1.2 18h1.7L6.4 3.9H4.6L17.7 20z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.5-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.7v6.1zM5.3 7.4C4.1 7.4 3.2 6.5 3.2 5.4S4.1 3.4 5.3 3.4s2.1.9 2.1 2c0 1.1-.9 2-2.1 2zM7 20.5H3.6V9H7v11.5z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" strokeLinecap="round" />
    </svg>
  );
}
