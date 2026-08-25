// Pure types/constants shared between server (src/db/queries/reading-status.ts)
// and client (read-status-control.tsx) code. Deliberately has NO "server-only"
// guard and NO db import - importing anything from the server query module
// directly in a client component pulls in mysql2 and breaks the client bundle
// (confirmed by a real build failure, not a hypothetical).

// Real bug found and fixed (2026-08-25): this was originally typed with
// guessed Turkish literals ("okudum"/"okuyorum"/"okuyacagim") against a
// `read.status` column that actually stores v1's real ReadStatusEnum
// values - confirmed both by querying real production data (39 finishRead/
// 69 targetRead/3 currentRead rows, zero okudum/okuyorum/okuyacagim) and by
// reading `backend/src/Enums/ReadStatusEnum.php` directly. Every reading-
// status feature (profile shelves, book readers list, reading goals, the
// weekly "book_read" point award) silently matched zero real rows against
// production. "yarida-birakildi" (dropped) has no v1 equivalent at all -
// a genuinely new v2 feature - renamed to `dropRead` only for naming
// consistency with the other three, not because of a real-data conflict.
export const READ_STATUSES = [
  "finishRead",
  "currentRead",
  "targetRead",
  "dropRead",
] as const;
export type ReadStatus = (typeof READ_STATUSES)[number];

export const DROP_REASONS = [
  "sikiciydi",
  "agirdi",
  "dili-zor",
  "ilgimi-cekmedi",
] as const;
export type DropReason = (typeof DROP_REASONS)[number];

export const DROP_REASON_LABELS: Record<DropReason, string> = {
  sikiciydi: "Sıkıcıydı",
  agirdi: "Ağırdı",
  "dili-zor": "Dili zordu",
  "ilgimi-cekmedi": "İlgimi çekmedi",
};

export interface CurrentReadStatus {
  status: ReadStatus;
  dropReason: DropReason | null;
  dropPercentage: number | null;
}
