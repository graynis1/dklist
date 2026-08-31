"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribeNever = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the server can't know the user's stored/system
  // preference, so render nothing meaningful until mounted on the client.
  // useSyncExternalStore (rather than a mount-effect + setState) gives a
  // `false` server/first-client-render snapshot and a `true` snapshot on
  // every render after, with no extra render pass to trigger.
  const mounted = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 rounded-full"
      aria-label="Tema değiştir"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </Button>
  );
}
