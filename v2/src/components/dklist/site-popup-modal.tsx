"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSitePopupAction } from "@/actions/site-popup";

const SESSION_KEY = "dklist-site-popup-shown";

/**
 * Ports v1's real SitePopupModal.js - a global, admin-configurable
 * announcement/promo popup shown once per browser session (not a real ad
 * unit, no AdSense - a generic slot the admin can point at anything).
 * Mounted once in the root layout so it applies to every page.
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          {popup.title && <DialogTitle>{popup.title}</DialogTitle>}
        </DialogHeader>
        {popup.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/site-popup-image/${popup.image}`} alt="" className="w-full rounded-md" />
        )}
        {popup.content && <p className="text-sm text-muted-foreground">{popup.content}</p>}
        {popup.link && (
          <Button render={<a href={popup.link} target="_blank" rel="noopener noreferrer" />} nativeButton={false} className="w-fit">
            Daha Fazla
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
