"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { ProfileLink } from "@/components/dklist/profile-link";

interface ActionResult {
  status: boolean;
  message?: string;
}

interface Member {
  userId: number;
  username: string;
  role: string;
}

/**
 * Real customer question: "istenmeyen ve uygun olmayan kişiyi gruptan atıp
 * yada almamak için kullanım açısından" - the club owner had a member list
 * but no way to remove anyone from it. Remove control only shows for
 * canManage viewers (owner/Admin/Mod), never on the owner's own row.
 */
export function ClubMemberList({
  clubId,
  slug,
  members,
  canManage,
  removeAction,
}: {
  clubId: number;
  slug: string;
  members: Member[];
  canManage: boolean;
  removeAction: (clubId: number, slug: string, targetUserId: number) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {members
          .filter((m) => !removedIds.has(m.userId))
          .map((m) => (
            <span
              key={m.userId}
              className="flex items-center gap-1 rounded-full border border-border py-1 pr-1 pl-3 text-sm"
            >
              <ProfileLink username={m.username} className="hover:underline">
                @{m.username}
                {m.role === "owner" && <span className="ml-1 text-xs text-muted-foreground">(kurucu)</span>}
              </ProfileLink>
              {canManage && m.role !== "owner" && (
                <button
                  type="button"
                  disabled={isPending}
                  title="Üyeyi çıkar"
                  aria-label={`@${m.username} kullanıcısını kulüpten çıkar`}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
                  onClick={() => {
                    if (!window.confirm(`@${m.username} kulüpten çıkarılsın mı?`)) return;
                    startTransition(async () => {
                      setError(null);
                      const result = await removeAction(clubId, slug, m.userId);
                      if (result.status) {
                        setRemovedIds((prev) => new Set(prev).add(m.userId));
                        router.refresh();
                      } else {
                        setError(result.message ?? "Çıkarılamadı.");
                      }
                    });
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </span>
          ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
