"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon, ArrowUpRightIcon, MegaphoneIcon } from "lucide-react";
import { getSitePopupAction } from "@/actions/site-popup";
import { sitePopupImageUrl } from "@/lib/image-urls";

const SESSION_KEY = "dklist-site-popup-shown";

/**
 * Ports v1's real SitePopupModal.js - a global, admin-configurable
 * announcement/promo popup shown once per browser session (not a real ad
 * unit, no AdSense - a generic slot the admin can point at anything).
 * Mounted once in the root layout so it applies to every page.
 *
 * Rebuilt from a bare generic Dialog (boxed title, padded/cropped image,
 * plain "Daha Fazla" button - flagged by the maintainer as "berbat,
 * görsellik sıfır") into a real promo-card layout: full-bleed hero image,
 * a floating close button over it, and an eyebrow + serif headline + CTA
 * matching the site's own typographic language (SectionLabel's orange
 * tracked-caps style) instead of a generic system dialog.
 */
export function SitePopupModal() {
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState<{ title: string | null; content: string | null; image: string | null; link: string | null } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    getSitePopupAction().then((result) => {
      if (!result.active) return;
      setPopup(result);
      setOpen(true);
      window.sessionStorage.setItem(SESSION_KEY, "1");
    });
  }, []);

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 duration-150 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="relative">
            {popup.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sitePopupImageUrl(popup.image)}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-primary/25 via-secondary to-primary/10">
                <MegaphoneIcon className="size-10 text-primary/70" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            <DialogPrimitive.Close
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Kapat"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-2.5 p-5">
            <span className="flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
              <MegaphoneIcon className="size-3.5" />
              Duyuru
            </span>
            {popup.title && (
              <DialogPrimitive.Title className="font-heading text-xl leading-tight font-medium text-balance">
                {popup.title}
              </DialogPrimitive.Title>
            )}
            {popup.content && (
              <p className="text-sm leading-relaxed text-muted-foreground">{popup.content}</p>
            )}
            {popup.link && (
              <a
                href={popup.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Daha Fazla
                <ArrowUpRightIcon className="size-4" />
              </a>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
