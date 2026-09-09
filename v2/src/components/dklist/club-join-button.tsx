"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ActionResult {
  status: boolean;
  message?: string;
  pending?: boolean;
}

export function ClubJoinButton({
  clubId,
  slug,
  isMember,
  isOwner,
  isPendingRequest,
  signedIn,
  joinAction,
  leaveAction,
}: {
  clubId: number;
  slug: string;
  isMember: boolean;
  isOwner: boolean;
  isPendingRequest: boolean;
  signedIn: boolean;
  joinAction: (clubId: number, slug: string) => Promise<ActionResult>;
  leaveAction: (clubId: number, slug: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [member, setMember] = useState(isMember);
  const [pending, setPending] = useState(isPendingRequest);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Button render={<Link href="/giris" />} nativeButton={false}>
        Katılmak için giriş yap
      </Button>
    );
  }

  if (isOwner) {
    return <Button variant="outline" disabled>Kurucusun</Button>;
  }

  if (pending && !member) {
    return <Button variant="outline" disabled>Onay Bekleniyor</Button>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={member ? "outline" : "default"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = member ? await leaveAction(clubId, slug) : await joinAction(clubId, slug);
            if (result.status) {
              if (member) {
                setMember(false);
              } else if (result.pending) {
                setPending(true);
              } else {
                setMember(true);
              }
              router.refresh();
            } else {
              setError(result.message ?? "İşlem başarısız oldu.");
            }
          })
        }
      >
        {member ? "Kulüpten Ayrıl" : "Kulübe Katıl"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
