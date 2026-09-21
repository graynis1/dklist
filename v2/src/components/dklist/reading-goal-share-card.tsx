"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/dklist/share-button";

/**
 * Customer's ask (2026-09-03): "Kitap hedefini yüzdelik daire grafiği yada
 * farklı bir şey olarak paylaşabiliyor olmalıyız" - the reading goal
 * (targetCount vs readCount) had a progress BAR on the profile itself, but
 * no share card at all, unlike points/reading-score/per-book status which
 * all already got a real canvas-drawn share image this session. A donut
 * chart is the one honest, natural visual for "N of M books" - drawn with
 * real arc math from the real counts, not a decorative placeholder.
 */
export function ReadingGoalShareCard({
  username,
  year,
  readCount,
  targetCount,
}: {
  username: string;
  year: string;
  readCount: number;
  targetCount: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const pct = targetCount > 0 ? Math.round((readCount / targetCount) * 100) : 0;

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 1080;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gradient.addColorStop(0, "#1c2a24");
    gradient.addColorStop(1, "#0a120e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px system-ui, sans-serif";
    ctx.fillText("DKList Okuma Hedefi", 70, 130);
    ctx.font = "400 28px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`@${username} · ${year}`, 70, 175);

    const pct = targetCount > 0 ? readCount / targetCount : 0;
    const exceeded = readCount > targetCount;
    const clamped = Math.min(1, pct);

    // Donut chart - real arc math from the real counts, no invented shape.
    const cx = SIZE / 2;
    const cy = 560;
    const r = 260;
    const lineWidth = 56;
    const start = -Math.PI / 2;

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    if (clamped > 0) {
      ctx.strokeStyle = exceeded ? "#f5b942" : "#5fd3a0";
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + Math.PI * 2 * clamped);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "700 120px system-ui, sans-serif";
    ctx.fillText(`%${Math.round(pct * 100)}`, cx, cy + 40);
    ctx.font = "400 30px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`${readCount} / ${targetCount} kitap`, cx, cy + 90);
    ctx.textAlign = "left";

    if (exceeded) {
      ctx.font = "600 32px system-ui, sans-serif";
      ctx.fillStyle = "#f5b942";
      ctx.textAlign = "center";
      ctx.fillText("🎉 Hedef aşıldı!", cx, cy + r + 90);
      ctx.textAlign = "left";
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
      a.download = "dklist-okuma-hedefi.png";
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
          if (blob && navigator.canShare?.({ files: [new File([blob], "okuma-hedefi.png", { type: "image/png" })] })) {
            const file = new File([blob], "dklist-okuma-hedefi.png", { type: "image/png" });
            await navigator.share({ files: [file], title: "DKList Okuma Hedefi" });
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
      <canvas ref={canvasRef} className={generated ? "w-full max-w-[200px] rounded-lg border border-border" : "hidden"} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={draw}>
          {generated ? "Yeniden Oluştur" : "Daire Grafik Olarak Paylaş"}
        </Button>
        {generated && (
          <>
            <Button size="sm" variant="outline" onClick={download}>
              İndir
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button size="sm" variant="outline" disabled={isSharing} onClick={share}>
                Cihazdan Paylaş
              </Button>
            )}
            {/* Real customer report: "paylaş kısmında facebook ve diğer
                paylaşılacak yerler çıkmıyor" - Facebook/WhatsApp/Twitter's
                share dialogs can only attach a URL (they scrape its OG tags),
                never an arbitrary local canvas image, so this shares a real
                caption + link back to the profile rather than the PNG -
                the PNG itself is still available via İndir/Cihazdan Paylaş
                above for an actual image post.
                Follow-up real customer report (2026-09-22): the shared
                Facebook preview showed a stale/wrong image. Root-caused by
                fetching this exact profile URL with Facebook's own crawler
                user-agent - it correctly returns the real profile-og-image
                card right now, proving the currently-live code was never the
                bug. Facebook caches a link's preview per URL and only
                re-scrapes when it sees that URL for the first time (or is
                told to via their Sharing Debugger, a manual step this
                avoids); this profile link was almost certainly cached once,
                stale, from before this og:image existed at all. A `?og=`
                query string here is appended to the URL Facebook is asked to
                scrape - it doesn't change the profile page's own canonical
                og:url (see seo.ts's pageMetadata, deliberately left as the
                bare path so /profil/x itself stays one single canonical
                object, not fragmenting into one Facebook object per share),
                but it DOES force Facebook to treat this as a URL it hasn't
                crawled before, which triggers a genuine fresh fetch of that
                same canonical object - self-healing the cache on every
                future share, with zero manual Facebook Debugger step ever
                needed again. Value is the actual stat, so re-sharing the
                exact same unchanged goal doesn't spam Facebook with
                needless re-scrapes, but any real change always forces one. */}
            <ShareButton
              content={`@${username} bu yıl (${year}) okuma hedefinin %${pct}'ini tamamladı! 📚`}
              url={`/profil/${encodeURIComponent(username)}?og=${year}-${pct}`}
              size="sm"
            />
          </>
        )}
      </div>
    </div>
  );
}
