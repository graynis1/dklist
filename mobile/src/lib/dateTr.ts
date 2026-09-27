/** "2026-09-12" or an ISO timestamp → "12 Eylül 2026". */
export function formatDateTr(d: string) {
  const date = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
