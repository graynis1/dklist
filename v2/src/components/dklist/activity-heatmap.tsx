import type { ActivityHeatmapDay } from "@/db/queries/points";

const DAY_MS = 24 * 60 * 60 * 1000;

function intensityClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/25";
  if (count <= 5) return "bg-primary/50";
  if (count <= 10) return "bg-primary/75";
  return "bg-primary";
}

/** GitHub-contributions-style calendar - tenth item from the "what else
 * could be added" brainstorm list. Pure presentational (no client JS
 * needed - hover tooltips use the native `title` attribute), fed by
 * getUserActivityHeatmap()'s point_transaction-based day counts. */
export function ActivityHeatmap({ days, weeks = 26 }: { days: ActivityHeatmapDay[]; weeks?: number }) {
  const countByDate = new Map(days.map((d) => [d.date, d.count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Start on the Monday of (weeks-1) weeks ago, so the grid's columns
  // align to real calendar weeks.
  const todayDow = (today.getDay() + 6) % 7; // 0=Monday
  const start = new Date(today.getTime() - todayDow * DAY_MS - (weeks - 1) * 7 * DAY_MS);

  const columns: ActivityHeatmapDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: ActivityHeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const iso = date.toISOString().slice(0, 10);
      column.push({ date: iso, count: date > today ? -1 : (countByDate.get(iso) ?? 0) });
    }
    columns.push(column);
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {columns.map((column, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {column.map((day) =>
            day.count === -1 ? (
              <div key={day.date} className="size-3 rounded-sm bg-transparent" />
            ) : (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} etkinlik`}
                className={`size-3 rounded-sm ${intensityClass(day.count)}`}
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
