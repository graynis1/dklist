"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleLibraryAction } from "@/app/kitap/[slug]/actions";

export function LibraryToggle({
  bookId,
  signedIn,
  initialInLibrary,
}: {
  bookId: number;
  signedIn: boolean;
  initialInLibrary: boolean;
}) {
  const [inLibrary, setInLibrary] = useState(initialInLibrary);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) {
    return <Button variant="outline" disabled title="Giriş yapmalısınız">Kitaplığıma Ekle</Button>;
  }

  return (
    <Button
      variant={inLibrary ? "default" : "outline"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleLibraryAction(bookId);
          if (result.status && result.inLibrary !== undefined) {
            setInLibrary(result.inLibrary);
          }
        })
      }
    >
      {inLibrary ? "Kitaplığımda ✓" : "Kitaplığıma Ekle"}
    </Button>
  );
}
