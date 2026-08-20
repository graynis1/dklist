// Pure types/constants shared between server (src/db/queries/reading-status.ts)
// and client (read-status-control.tsx) code. Deliberately has NO "server-only"
// guard and NO db import - importing anything from the server query module
// directly in a client component pulls in mysql2 and breaks the client bundle
// (confirmed by a real build failure, not a hypothetical).

export const READ_STATUSES = [
  "okudum",
  "okuyorum",
  "okuyacagim",
  "yarida-birakildi",
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
