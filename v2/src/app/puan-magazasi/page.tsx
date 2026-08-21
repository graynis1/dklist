import { Suspense } from "react";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getActiveRewards, getUserRedeemedRewardIds, getUserActiveFrame } from "@/db/queries/point-store";
import { getUserTotalPoints } from "@/db/queries/points";
import { RedeemRewardButton } from "@/components/dklist/redeem-reward-button";

export default function PointStorePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Puan</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Puan Mağazası</h1>
          <p className="text-sm text-muted-foreground">
            Kazandığın puanları harcayarak profilin için özel bir çerçeve al.
          </p>
        </div>
        <Suspense fallback={<PointStoreSkeleton />}>
          <PointStoreContent />
        </Suspense>
      </div>
    </div>
  );
}

function PointStoreSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function PointStoreContent() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const [rewards, totalPoints, ownedRewardIds, activeFrame] = await Promise.all([
    getActiveRewards(),
    userId ? getUserTotalPoints(userId) : Promise.resolve(0),
    userId ? getUserRedeemedRewardIds(userId) : Promise.resolve([]),
    userId ? getUserActiveFrame(userId) : Promise.resolve(null),
  ]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Mağazayı kullanmak için giriş yapmalısınız.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Puanın: <strong>{totalPoints}</strong>
      </p>

      {rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Şu anda mağazada bir ödül yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((r) => {
            const owned = ownedRewardIds.includes(r.id);
            return (
              <li key={r.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <span className="size-10 shrink-0 rounded-full border-4" style={{ borderColor: r.rewardValue }} />
                <div className="flex-1">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.pointCost} puan{r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                <RedeemRewardButton
                  rewardId={r.id}
                  rewardValue={r.rewardValue}
                  owned={owned}
                  isActive={activeFrame === r.rewardValue}
                  canAfford={totalPoints >= r.pointCost}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
