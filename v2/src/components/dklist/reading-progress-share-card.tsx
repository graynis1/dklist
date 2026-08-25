"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TONE_STYLE, type BookCoverTone } from "@/components/dklist/book-cover";

const STATUS_LABEL: Record<string, string> = {
  currentRead: "Şu an okuyorum",
  finishRead: "Okudum",
  "dropRead": "Yarıda bıraktım",
};

/**
 * Third "paylaşım" share card - per-book reading status, not a profile-wide
 * summary like ReadingScoreCard/PointsShareCard. Deliberately does NOT show
 * a fake completion percentage for "currentRead" (currently reading) - there's
 * no real page-by-page progress tracking in this schema (read.dropPercentage
 * only exists for the "yarıda bıraktım" status), and a made-up progress bar
 * would be exactly the kind of dishonest AI-adjacent shortcut this project
 * has deliberately avoided elsewhere (book summaries, support answers).
 * Shows the one number that IS real for each status instead: the rating
 * for "finishRead", the real drop percentage for "yarıda bıraktım", nothing
 * invented for "currentRead".
 */
export function ReadingProgressShareCard({
  bookTitle,
  author,
  tone,
  status,
  rating,
  dropPercentage,
}: {
  bookTitle: string;
  author: string;
  tone: BookCoverTone;
  status: "currentRead" | "finishRead" | "dropRead";
  rating?: number | null;
  dropPercentage?: number | null;
}) {
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

    const t = TONE_STYLE[tone];
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Subtle top sheen, mirrors BookCover's own CSS gradient overlay so the
    // canvas card reads as "the same visual language", not a different asset.
    const sheen = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    sheen.addColorStop(0, "rgba(255,255,255,0.12)");
    sheen.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = t.fg;
    ctx.font = "600 32px system-ui, sans-serif";
    ctx.globalAlpha = 0.85;
    ctx.fillText("DKLIST", 80, 110);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = t.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 150);
    ctx.lineTo(SIZE - 80, 150);
    ctx.stroke();

    // status badge
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.globalAlpha = 0.9;
    ctx.fillText(STATUS_LABEL[status].toUpperCase(), 80, 230);
    ctx.globalAlpha = 1;

    // title (wrapped, up to 3 lines)
    ctx.font = "700 62px system-ui, sans-serif";
    const words = bookTitle.split(" ");
    let line = "";
    let y = 340;
    const maxWidth = SIZE - 160;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, 80, y);
        line = word;
        y += 74;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 80, y);
    y += 70;

    ctx.font = "400 34px system-ui, sans-serif";
    ctx.globalAlpha = 0.8;
    ctx.fillText(author, 80, y);
    ctx.globalAlpha = 1;

    // the one real, honest number for this status
    y += 110;
    if (status === "finishRead" && rating != null) {
      ctx.font = "400 26px system-ui, sans-serif";
      ctx.globalAlpha = 0.7;
      ctx.fillText("VERDİĞİM PUAN", 80, y);
      ctx.globalAlpha = 1;
      ctx.font = "700 100px system-ui, sans-serif";
      ctx.fillText(`${rating.toFixed(1)}/10`, 80, y + 100);
    } else if (status === "dropRead" && dropPercentage != null) {
      ctx.font = "400 26px system-ui, sans-serif";
      ctx.globalAlpha = 0.7;
      ctx.fillText("BIRAKTIĞIM NOKTA", 80, y);
      ctx.globalAlpha = 1;
      ctx.font = "700 100px system-ui, sans-serif";
      ctx.fillText(`%${dropPercentage}`, 80, y + 100);
    }

    ctx.font = "400 24px system-ui, sans-serif";
    ctx.globalAlpha = 0.5;
    ctx.fillText("dklist.com", 80, SIZE - 60);
    ctx.globalAlpha = 1;

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
      a.download = "dklist-okuma-durumu.png";
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
          if (blob && navigator.canShare?.({ files: [new File([blob], "okuma-durumu.png", { type: "image/png" })] })) {
            const file = new File([blob], "dklist-okuma-durumu.png", { type: "image/png" });
            await navigator.share({ files: [file], title: bookTitle });
          }
          resolve();
        }, "image/png");
      });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className={generated ? "w-full max-w-[180px] rounded-lg border border-border" : "hidden"}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={draw}>
          {generated ? "Yeniden Oluştur" : "Kart Olarak Paylaş"}
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
