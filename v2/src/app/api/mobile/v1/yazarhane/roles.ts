import { USER_TYPES } from "@/lib/roles";

/** Roles that already reach Yazarhane without applying - same list the web /yazarhane page uses. */
export const AUTHOR_LIKE_ROLES: string[] = [USER_TYPES.Yazar, USER_TYPES.Mod, USER_TYPES.Admin, USER_TYPES.Kurucu, USER_TYPES.SuperAdmin];
