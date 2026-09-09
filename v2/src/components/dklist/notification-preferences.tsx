"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setNotificationPreferenceAction } from "@/app/bildirimler/actions";
import { CONFIGURABLE_NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/lib/notification-types";

/**
 * Customer's ask: per-notification-type opt-in/out, most concretely
 * motivated by club activity ("kulüp bildirimleri") - a member of several
 * active clubs could otherwise get pinged for every single book pick with
 * no way to quiet just that one source.
 */
export function NotificationPreferences({
  initialPreferences,
}: {
  initialPreferences: Record<(typeof CONFIGURABLE_NOTIFICATION_TYPES)[number], boolean>;
}) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [pendingType, setPendingType] = useState<NotificationType | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Real ask (2026-09-10): this used to render always-expanded, taking up
  // permanent space above the notification list itself - "ayarlar
  // şeklinde bir ibareye tıklayınca açılıp kapansa ... direkt sayfada
  // böyle sürekli görünmese daha estetik olur". A plain toggle rather
  // than <details> so the "Açık/Kapalı" buttons' own pending state isn't
  // fighting a second, unrelated open/close mechanism.
  const [open, setOpen] = useState(false);

  function toggle(type: (typeof CONFIGURABLE_NOTIFICATION_TYPES)[number]) {
    const next = !prefs[type];
    setError(null);
    setPendingType(type);
    startTransition(async () => {
      const result = await setNotificationPreferenceAction(type, next);
      if (result.status) {
        setPrefs((p) => ({ ...p, [type]: next }));
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
      setPendingType(null);
    });
  }

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div>
          <p className="text-sm font-medium">Bildirim Tercihleri</p>
          {!open && <p className="text-xs text-muted-foreground">Hangi türde bildirim almak istediğini buradan yönetebilirsin.</p>}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? "Kapat" : "Ayarlar"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-4 pt-3">
          {CONFIGURABLE_NOTIFICATION_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between gap-4 border-t border-border pt-2 first:border-t-0 first:pt-0">
              <p className="text-sm">{NOTIFICATION_TYPE_LABELS[type]}</p>
              <Button
                size="sm"
                variant={prefs[type] ? "default" : "outline"}
                disabled={isPending && pendingType === type}
                onClick={() => toggle(type)}
              >
                {prefs[type] ? "Açık" : "Kapalı"}
              </Button>
            </div>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
