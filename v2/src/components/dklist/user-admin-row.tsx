"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, USER_TYPES, type UserType } from "@/lib/roles";
import {
  updateUserRoleAction,
  toggleUserDisabledAction,
  updateUserPublisherAction,
  updateUserWriterAction,
  deleteUserAccountAction,
  getUserAssignmentPanelDataAction,
  updateUserBadgesAction,
  setUserFrameAdminAction,
  banUserEmailAction,
  suspendUserAction,
  liftSuspensionAction,
} from "@/app/admin/kullanicilar/actions";
import { UserAssignmentPanel } from "@/components/dklist/user-assignment-panel";
import { searchPublishersAction, searchWritersAction } from "@/app/kitap/yeni/actions";
import { EntityLinkControl } from "@/components/dklist/entity-link-control";
import type { UserAdminListItem } from "@/db/queries/user-admin";

const ASSIGNABLE_ROLES = Object.values(USER_TYPES).filter((t) => t !== USER_TYPES.SuperAdmin) as UserType[];

export function UserAdminRow({
  user,
  isSuspended,
  canMutate = true,
  canDelete = false,
}: {
  user: UserAdminListItem;
  /** Computed on the server (page.tsx) and passed in - `new Date() > new
   * Date()` at render time in a client component is a hydration-mismatch
   * source (React #418), see relative-time.tsx for the full story. */
  isSuspended: boolean;
  canMutate?: boolean;
  /** Same Admin-tier gate as canMutate now (fixed 2026-09-08 - was
   * SuperAdmin-only, unreachable by anyone in practice, see actions.ts).
   * Kept as a separate prop rather than folded into canMutate in case
   * this ever needs to diverge again later. */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  function changeRole(newType: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, newType);
      if (!result.status) setError(result.message ?? "Güncellenemedi.");
      else router.refresh();
    });
  }

  function toggleDisabled() {
    setError(null);
    startTransition(async () => {
      const result = await toggleUserDisabledAction(user.id);
      if (!result.status) setError(result.message ?? "Güncellenemedi.");
      else router.refresh();
    });
  }

  function deleteAccount() {
    if (!window.confirm(`${user.username} hesabını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAccountAction(user.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  const [emailBanned, setEmailBanned] = useState(false);
  function banEmail() {
    if (!window.confirm(`${user.mail} adresini engellemek istediğinizden emin misiniz? Bu e-posta ile yeniden kayıt olunamayacak.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await banUserEmailAction(user.id);
      if (!result.status) setError(result.message ?? "Engellenemedi.");
      else setEmailBanned(true);
    });
  }

  const [showSuspendPanel, setShowSuspendPanel] = useState(false);
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");

  function suspend() {
    const days = Number(suspendDays);
    if (!window.confirm(`${user.username} kullanıcısını ${days} gün boyunca askıya almak istediğinizden emin misiniz?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await suspendUserAction(user.id, days, suspendReason);
      if (!result.status) setError(result.message ?? "Askıya alınamadı.");
      else {
        setShowSuspendPanel(false);
        router.refresh();
      }
    });
  }

  function liftSuspend() {
    setError(null);
    startTransition(async () => {
      const result = await liftSuspensionAction(user.id);
      if (!result.status) setError(result.message ?? "Kaldırılamadı.");
      else router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">
          {user.username}
          {user.disabled && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Devre dışı</span>}
          {isSuspended && (
            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600" title={user.suspensionReason ?? undefined}>
              Askıda · {new Date(user.suspendedUntil!).toLocaleDateString("tr-TR")}&apos;e kadar
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{user.mail}</p>
        {user.userType === USER_TYPES.Yayinevi && canMutate && (
          <EntityLinkControl
            label="Yayınevi"
            currentId={user.publisherId}
            currentName={user.publisherName}
            searchAction={searchPublishersAction}
            linkAction={(id) => updateUserPublisherAction(user.id, id)}
          />
        )}
        {user.userType === USER_TYPES.Yazar && canMutate && (
          <EntityLinkControl
            label="Yazar"
            currentId={user.writerId}
            currentName={user.writerName}
            searchAction={searchWritersAction}
            linkAction={(id) => updateUserWriterAction(user.id, id)}
          />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {user.userType === USER_TYPES.Kurucu ? (
        <span className="rounded-lg border border-border px-2 py-1.5 text-sm text-muted-foreground" title="Kurucu rolü geri alınamaz">
          {ROLE_LABELS[USER_TYPES.Kurucu]}
        </span>
      ) : (
        <Select
          value={user.userType}
          disabled={isPending || !canMutate}
          onValueChange={(v) => v && changeRole(v)}
          items={ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Real customer report: "Devre Dışı Bırak sekmesi var sadece bu
          direk siteden silmeye mi yarıyor?" - relabeled to make clear
          this is reversible and does NOT delete anything (unlike Hesabı
          Sil below), matching what it already actually does. */}
      <Button variant="outline" size="sm" disabled={isPending || !canMutate} onClick={toggleDisabled} title="Süresiz, geri alınabilir, hesabı silmez.">
        {user.disabled ? "Askıyı Kaldır" : "Süresiz Askıya Al"}
      </Button>

      {/* Customer's explicit ask: a TIME-LIMITED suspension, distinct from
          the indefinite toggle above - auto-lifts on its own once the
          chosen duration passes. */}
      {canMutate && !isSuspended && (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => setShowSuspendPanel((s) => !s)} title="Süre dolunca otomatik kalkar.">
          Süreli Uzaklaştır
        </Button>
      )}
      {canMutate && isSuspended && (
        <Button variant="outline" size="sm" disabled={isPending} onClick={liftSuspend} title="Süreli askıyı erken kaldır.">
          Süreli Askıyı Kaldır
        </Button>
      )}

      {canMutate && (
        <Button variant="outline" size="sm" onClick={() => setShowAssignPanel((s) => !s)}>
          Rozet &amp; Çerçeve
        </Button>
      )}

      {/* Real customer report: "yanlış kişiyi silsen yine aynı hesapla
          geri geliş mümkün engelleme olmalı maile sanki." A separate
          action from delete - either can be done first. */}
      {canMutate && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || emailBanned}
          onClick={banEmail}
          title="Bu e-posta ile yeniden kayıt olmayı önler, hesabı silmez."
        >
          {emailBanned ? "E-posta Engellendi" : "E-postayı Engelle"}
        </Button>
      )}

      {canDelete && (
        <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={deleteAccount} title="Kalıcı, geri alınamaz.">
          Hesabı Sil
        </Button>
      )}
    </div>

      {showAssignPanel && canMutate && (
        <UserAssignmentPanel
          userId={user.id}
          loadData={() => getUserAssignmentPanelDataAction(user.id)}
          onSaveBadges={(ids) => updateUserBadgesAction(user.id, ids)}
          onSaveFrame={(value) => setUserFrameAdminAction(user.id, value)}
        />
      )}

      {showSuspendPanel && canMutate && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Gün
            <Input type="number" min={1} max={3650} className="w-20" value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Sebep (opsiyonel)
            <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Kural ihlali, spam vb." />
          </label>
          <Button size="sm" disabled={isPending} onClick={suspend}>
            Onayla
          </Button>
        </div>
      )}
    </li>
  );
}
