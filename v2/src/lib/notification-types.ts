/**
 * Pure notification-type data, split out of db/queries/notifications.ts -
 * a client component (notification-preferences.tsx) needs these constants
 * but importing them straight from the query module (which pulls in
 * mysql2/drizzle) would drag the DB driver into the browser bundle, same
 * bug class as the permission.ts/roles.ts split earlier this project (see
 * PLAN.md). No "server-only" import here on purpose - this file must be
 * safe for the client.
 */
export const NOTIFICATION_TYPES = ["club", "follow", "mention", "badge", "message", "marketplace", "system"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CONFIGURABLE_NOTIFICATION_TYPES = ["club", "follow", "mention", "badge", "message", "marketplace"] as const satisfies readonly NotificationType[];

export const NOTIFICATION_TYPE_LABELS: Record<(typeof CONFIGURABLE_NOTIFICATION_TYPES)[number], string> = {
  club: "Kulüp etkinlikleri (yeni kitap seçimi vb.)",
  follow: "Takip bildirimleri",
  mention: "Etiketlenme (#kullaniciadi)",
  badge: "Rozet ve puan kilometre taşları",
  message: "Yeni mesaj bildirimleri",
  marketplace: "Askıda Kitap bildirimleri",
};
