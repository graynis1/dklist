"use server";

import { getSitePopup, type SitePopupView } from "@/db/queries/site-popup";

export async function getSitePopupAction(): Promise<SitePopupView> {
  return getSitePopup();
}
