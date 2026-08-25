"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminCategory } from "@/lib/admin-nav";
import type { AdminDashboardCounts } from "@/db/queries/admin-dashboard";

/**
 * Client-only piece of the admin shell - just the nav links + active-state
 * highlighting (needs usePathname). Split out of AdminSidebar so the rest
 * of the shell (session lookup, sign-out form action) stays a plain server
 * component, same split rationale as PhotoBookCover/BookCover.
 */
export function AdminSidebarNav({
  categories,
  counts,
}: {
  categories: AdminCategory[];
  counts: AdminDashboardCounts;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category.label}>
          <p className="mb-1.5 px-2 text-[0.7rem] font-semibold tracking-wider text-sidebar-foreground/45 uppercase">
            {category.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {category.tools.map((tool) => {
              const active = pathname === tool.href;
              const count = tool.countKey ? counts[tool.countKey] : 0;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="truncate">{tool.label}</span>
                    {count > 0 && (
                      <span className="inline-flex min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-destructive px-1 py-0.5 text-[0.65rem] leading-none font-semibold text-destructive-foreground">
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
