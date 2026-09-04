"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { layoutQuoteText } from "@/lib/quote-card-layout";

/**
 * Alıntı-görsel paylaşım kartı - third item from the "what else could be
 * added" brainstorm list. Same Canvas-2D, zero-external-image approach as
 * ReadingScoreCard (no CORS-taint risk, toBlob/toDataURL always work) -
 * an Instagram-style typography card for a single quote, not a stats card.
 *
 * The word-wrap + shrink-to-fit math itself lives in the pure, unit-tested
 * `src/lib/quote-card-layout.ts` (a real `<canvas>` is needed to unit-test
 * this component directly, since it calls `ctx.measureText`) - this
 * component just supplies the actual measuring callback.
 */
export function QuoteCard({ quoteText, sourceName }: { quoteText: string; sourceName: string }) {
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
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#0d0d16");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "700 160px Georgia, serif";
    ctx.fillText("“", 60, 220);

    const maxWidth = SIZE - 160;
    ctx.fillStyle = "#ffffff";

    // Shrink the font if the quote is long enough to overflow the card,
    // rather than clipping or truncating real quote text.
    const { fontSize, lines: wrapped, lineHeight, totalHeight } = layoutQuoteText(
      quoteText,
      (line, size) => {
        ctx.font = `500 ${size}px Georgia, serif`;
        return ctx.measureText(line).width;
      },
      {
        maxWidth,
        boxHeight: SIZE - 420,
        initialFontSize: 52,
        minFontSize: 28,
        fontStep: 4,
        lineHeightRatio: 1.35,
      },
    );
    ctx.font = `500 ${fontSize}px Georgia, serif`;

    let y = SIZE / 2 - totalHeight / 2 + fontSize;
    for (const line of wrapped) {
      ctx.fillText(line, 80, y);
      y += lineHeight;
    }

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, SIZE - 160);
    ctx.lineTo(240, SIZE - 160);
    ctx.stroke();

    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(sourceName, 80, SIZE - 110);

    ctx.font = "400 24px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("dklist.com", 80, SIZE - 60);

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
      a.download = "dklist-alinti.png";
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
          if (blob && navigator.canShare?.({ files: [new File([blob], "alinti.png", { type: "image/png" })] })) {
            const file = new File([blob], "dklist-alinti.png", { type: "image/png" });
            await navigator.share({ files: [file], title: "DKList Alıntı" });
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
        className={generated ? "w-full max-w-[220px] rounded-lg border border-border" : "hidden"}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={draw}>
          {generated ? "Yeniden Oluştur" : "Görsel Kart Oluştur"}
        </Button>
        {generated && (
          <>
            <Button size="sm" variant="ghost" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={download}>
              İndir
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button size="sm" variant="ghost" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" disabled={isSharing} onClick={share}>
                Paylaş
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
