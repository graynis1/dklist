import { apiFetch } from "@/api/client";

export interface EditableProfile {
  name: string;
  surname: string;
  sex: string;
  birthDate: string;
  birthPlace: string | null;
  livingCity: string | null;
  biyo: string | null;
  edu: string | null;
  job: string | null;
  image: string | null;
  twoFactorEnabled: boolean;
  privacy: boolean;
  verified: boolean;
}

export async function getEditableProfile() {
  return apiFetch<{ status: "ok"; profile: EditableProfile }>("/me/edit");
}

export interface UpdateAccountInput {
  name: string;
  surname: string;
  sex: string;
  birthDate: string;
  biyo?: string;
  livingCity?: string;
  password?: string;
  privacy?: boolean;
  twoFactorEnabled?: boolean;
}

export async function updateAccount(input: UpdateAccountInput) {
  return apiFetch<{ status: "ok"; recoveryCodes: string[] | null }>("/me", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getDataExport() {
  return apiFetch<{ status: "ok"; data: unknown }>("/me/data-export");
}

export async function uploadAvatar(image: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  // @ts-expect-error - RN's fetch/FormData accepts this shape for a local
  // asset URI, not a real Blob/File (no such thing on-device).
  formData.append("avatar", { uri: image.uri, name: image.name, type: image.type });
  return apiFetch<{ status: "ok"; image: string }>("/me/avatar", { method: "POST", body: formData });
}
