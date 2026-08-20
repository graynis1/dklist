import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { FollowListItem } from "@/db/queries/profile";

export function FollowList({ items, emptyMessage }: { items: FollowListItem[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((u) => (
        <li key={u.id}>
          <Link
            href={`/profil/${u.username}`}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
          >
            <Avatar className="size-9 text-sm">
              <AvatarFallback>{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">@{u.username}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
