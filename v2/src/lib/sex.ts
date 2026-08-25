/**
 * v1's `SexEnum` (`backend/src/Enums/SexEnum.php`) stores the real,
 * Turkish-cased strings below directly in `user.sex` (a free-text
 * `varchar(40)`, no DB-level enum constraint) - NOT a slugified/lowercased
 * form. v2's registration and profile-edit forms originally used
 * "erkek"/"kadin"/"belirtmek-istemiyorum" as the submitted `<Select>`
 * values instead of guessing/slugifying, the same bug class already found
 * and fixed twice elsewhere in this project (`read.status`'s real
 * ReadStatusEnum values, `comment.type`'s real "comment"/"quotation"
 * values) - confirmed here the same way, by reading the real PHP enum
 * rather than assuming a natural-looking slug. Left as-written, every new
 * v2 registration/profile-edit would silently write a value that never
 * matches any real v1-era account's `sex` column, and the profile-edit
 * form's `defaultValue` would never match an existing real value either
 * (forcing a reselect that then overwrites it with the wrong-cased slug).
 * Single source of truth so both forms stay in sync.
 */
export const SEX_OPTIONS = [
  { value: "Erkek", label: "Erkek" },
  { value: "Kadın", label: "Kadın" },
  { value: "Belirtmek İstemiyorum", label: "Belirtmek istemiyorum" },
] as const;
