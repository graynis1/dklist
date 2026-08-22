"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/app/giris/actions";

/**
 * Client component so the 2FA code-entry step can appear in place (same
 * page, no navigation) - the username/password stay in React state for
 * the brief duration between the two submissions, the same trust
 * boundary as any multi-field form, never touching a URL or cookie.
 */
export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);
      if (needsCode) formData.set("code", code);

      const result = await loginAction(formData);
      if (result.status === "two_factor_required") {
        setNeedsCode(true);
      } else {
        setError(result.message);
      }
    });
  }

  if (needsCode) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          E-postana gönderilen doğrulama kodunu ya da bir yedek kodunu gir.
        </p>
        <Input
          name="code"
          placeholder="6 haneli kod veya yedek kod (xxxx-xxxx)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={9}
          required
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending} className="w-full">
          Doğrula
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        name="username"
        placeholder="Kullanıcı adı"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        name="password"
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        Giriş Yap
      </Button>
    </form>
  );
}
