"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface PointsShareStats {
  totalPoints: number;
  weeklyPoints: number;
  weeklyRank: number | null;
  streakDays: number;
}

/**
 * Second "puan paylaşımı" share card (maintainer's explicit ask, alongside
 * the yearly ReadingScoreCard) - a lighter, always-current snapshot (total
 * points, this week's rank, activity streak) rather than a once-a-year
 * report. Same Canvas 2D approach as ReadingScoreCard (no external images,
 * so toBlob/toDataURL never risk a CORS-tainted canvas).
 */
export function PointsShareCard({ username, stats }: { username: string; stats: PointsShareStats }) {
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

    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gradient.addColorStop(0, "#4a2a10");
    gradient.addColorStop(1, "#1c0d08");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px system-ui, sans-serif";
    ctx.fillText("DKList Puan Kartı", 70, 130);
    ctx.font = "400 28px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`@${username}`, 70, 175);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 210);
    ctx.lineTo(SIZE - 70, 210);
    ctx.stroke();

    // Big hero number - the total, front and center rather than one row
    // among equals, since it's the number someone shares this card FOR.
    ctx.font = "400 26px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("TOPLAM PUAN", 70, 300);
    ctx.font = "700 140px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(stats.totalPoints.toLocaleString("tr-TR"), 70, 420);

    const rows: [string, string][] = [
      ["Bu Hafta Kazanılan", stats.weeklyPoints.toLocaleString("tr-TR")],
      ...(stats.weeklyRank ? ([["Haftalık Sıralama", `#${stats.weeklyRank}`]] as [string, string][]) : []),
      ["Aktivite Serisi", `${stats.streakDays} gün`],
    ];

    let y = 560;
    for (const [label, value] of rows) {
      ctx.font = "400 24px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(label.toUpperCase(), 70, y);
      ctx.font = "600 48px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(value, 70, y + 55);
      y += 130;
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
      a.download = "dklist-puan-karti.png";
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
          if (blob && navigator.canShare?.({ files: [new File([blob], "puan-karti.png", { type: "image/png" })] })) {
            const file = new File([blob], "dklist-puan-karti.png", { type: "image/png" });
            await navigator.share({ files: [file], title: "DKList Puan Kartı" });
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
          {generated ? "Yeniden Oluştur" : "Puan Kartı Oluştur"}
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
