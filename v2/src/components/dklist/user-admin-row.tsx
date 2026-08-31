"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
} from "@/app/admin/kullanicilar/actions";
import { UserAssignmentPanel } from "@/components/dklist/user-assignment-panel";
import { searchPublishersAction, searchWritersAction } from "@/app/kitap/yeni/actions";
import { EntityLinkControl } from "@/components/dklist/entity-link-control";
import type { UserAdminListItem } from "@/db/queries/user-admin";

const ASSIGNABLE_ROLES = Object.values(USER_TYPES).filter((t) => t !== USER_TYPES.SuperAdmin) as UserType[];

export function UserAdminRow({
  user,
  canMutate = true,
  canDelete = false,
}: {
  user: UserAdminListItem;
  canMutate?: boolean;
  /** Full account deletion is SuperAdmin-only (matches v1's real
   * deleteUserAdmin() gate exactly) - stricter than canMutate, which
   * covers role/disable/publisher changes an ordinary Admin can do. */
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

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">
          {user.username}
          {user.disabled && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Devre dışı</span>}
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

      <Button variant="outline" size="sm" disabled={isPending || !canMutate} onClick={toggleDisabled}>
        {user.disabled ? "Aktif Et" : "Devre Dışı Bırak"}
      </Button>

      {canMutate && (
        <Button variant="outline" size="sm" onClick={() => setShowAssignPanel((s) => !s)}>
          Rozet &amp; Çerçeve
        </Button>
      )}

      {canDelete && (
        <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={deleteAccount}>
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
    </li>
  );
}
