"use client";

import { useState } from "react";

/**
 * v1's ShareComponent.js - a generic external social-share popover (Facebook/
 * Twitter/LinkedIn/WhatsApp), used on book pages, blog posts, Askıda Kitap
 * listings, and individual comments. v2 had nothing like it anywhere -
 * confirmed via a full-repo grep for any facebook.com/sharer or similar
 * before building this, not assumed missing.
 *
 * `url` defaults to the current page's URL (computed at click-time, not
 * render-time, so this is safe to use in a server-rendered tree without any
 * SSR/window guard). `content` is the share text (Twitter's tweet text,
 * mobile-share-sheet title) - callers pass something meaningful (a book
 * title, a comment excerpt), matching what v1's callers each passed.
 */
export function ShareButton({ content, url }: { content: string; url?: string }) {
  const [open, setOpen] = useState(false);

  function resolveUrl() {
    return url ?? (typeof window !== "undefined" ? window.location.href : "");
  }

  function shareFacebook() {
    const shareUrl = resolveUrl();
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: content, url: shareUrl }).catch(() => {});
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
    }
  }

  function shareTwitter() {
    const shareUrl = resolveUrl();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
    );
  }

  function shareLinkedin() {
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(resolveUrl())}`, "_blank");
  }

  function shareWhatsapp() {
    // Just the link, not link+text - WhatsApp already builds its own preview
    // card from the page's Open Graph tags, so adding the text again would
    // show the same content twice (once as a plain message, once under the
    // card), matching a real fix already made in v1's own ShareComponent.
    window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(resolveUrl())}`, "_blank");
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Paylaş"
        className="text-muted-foreground hover:text-foreground"
      >
        ↗
      </button>
      {open && (
        <div className="absolute z-20 mt-2 flex gap-3 rounded-md border border-border bg-popover p-3 text-sm shadow-md">
          <button type="button" onClick={shareFacebook} className="hover:text-foreground" title="Facebook'ta paylaş">
            Facebook
          </button>
          <button type="button" onClick={shareTwitter} className="hover:text-foreground" title="Twitter'da paylaş">
            Twitter
          </button>
          <button type="button" onClick={shareLinkedin} className="hover:text-foreground" title="LinkedIn'de paylaş">
            LinkedIn
          </button>
          <button type="button" onClick={shareWhatsapp} className="hover:text-foreground" title="WhatsApp'ta paylaş">
            WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
