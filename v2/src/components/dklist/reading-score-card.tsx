"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReadingScoreStats } from "@/db/queries/profile";

/**
 * "DKList Reading Score" (Spotify-Wrapped-for-books) share card - the
 * customer's single most explicitly prioritized ask this session. Matches
 * v1's existing Canvas-card approach (see UserReadStatusesComponent.js):
 * draws entirely with Canvas 2D primitives (gradient + text), deliberately
 * NO external images (no avatar) so the canvas never becomes tainted and
 * toBlob/toDataURL always work with zero CORS risk. Downloads via a Blob
 * URL, or uses navigator.share with files where supported.
 */
export function ReadingScoreCard({ username, stats }: { username: string; stats: ReadingScoreStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 1080;
    canvas.width = SIZE;
    canvas.height = SIZE;

    // Plain hex, not the site's oklch() tokens - canvas gradient stops need
    // browser-reliable color syntax, oklch() support varies.
    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gradient.addColorStop(0, "#3a1810");
    gradient.addColorStop(1, "#1c0d08");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px system-ui, sans-serif";
    ctx.fillText("DKList Reading Score", 70, 130);
    ctx.font = "400 28px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`@${username} — ${stats.year}`, 70, 175);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 210);
    ctx.lineTo(SIZE - 70, 210);
    ctx.stroke();

    const hours = Math.floor(stats.totalMinutes / 60);
    const mins = stats.totalMinutes % 60;

    const rows: [string, string][] = [
      ["Okunan Kitap", String(stats.booksRead)],
      ["Toplam Sayfa", stats.totalPages.toLocaleString("tr-TR")],
      ...(stats.totalMinutes > 0 ? ([["Okuma Süresi", `${hours} sa ${mins} dk`]] as [string, string][]) : []),
      ["En Çok Okunan Kategori", stats.topCategory ?? "—"],
      ["En Çok Okunan Yazar", stats.topWriter ?? "—"],
    ];

    let y = 300;
    for (const [label, value] of rows) {
      ctx.font = "400 26px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(label.toUpperCase(), 70, y);
      ctx.font = "600 56px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(value, 70, y + 60);
      y += 150;
    }

    ctx.font = "400 24px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("dklist.com", 70, SIZE - 60);

    setGenerated(true);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dklist-reading-score-${stats.year}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.share) return;
    setIsSharing(true);
    try {
      await new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare?.({ files: [new File([blob], "reading-score.png", { type: "image/png" })] })) {
            const file = new File([blob], `dklist-reading-score-${stats.year}.png`, { type: "image/png" });
            await navigator.share({ files: [file], title: "DKList Reading Score" });
          }
          resolve();
        }, "image/png");
      });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        className={generated ? "w-full max-w-xs rounded-lg border border-border" : "hidden"}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={draw}>
          {generated ? "Yeniden Oluştur" : "Görsel Kart Oluştur"}
        </Button>
        {generated && (
          <>
            <Button size="sm" variant="outline" onClick={download}>
              İndir
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button size="sm" variant="outline" disabled={isSharing} onClick={share}>
                Paylaş
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
