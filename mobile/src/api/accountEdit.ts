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
