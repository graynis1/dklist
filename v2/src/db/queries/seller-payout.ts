import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellerPayoutProfile, user } from "@/db/schema";
import { getIyzicoConfig } from "@/db/queries/marketplace-settings";
import { createSubMerchant, isIyzicoConfigured } from "@/lib/iyzico";

export type SellerPayoutStatus = "not_onboarded" | "pending" | "active" | "rejected";

export interface SellerPayoutView {
  status: SellerPayoutStatus;
  iban: string | null;
  identityNumber: string | null;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

export async function getSellerPayoutProfile(userId: number): Promise<SellerPayoutView> {
  const [row] = await db.select().from(sellerPayoutProfile).where(eq(sellerPayoutProfile.userId, userId)).limit(1);
  if (!row) {
    return { status: "not_onboarded", iban: null, identityNumber: null, contactName: null, phone: null, address: null, city: null };
  }
  return {
    status: row.status as SellerPayoutStatus,
    iban: row.iban,
    identityNumber: row.identityNumber,
    contactName: row.contactName,
    phone: row.phone,
    address: row.address,
    city: row.city,
  };
}

export interface UpdateSellerPayoutInput {
  iban: string;
  identityNumber: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
}

/**
 * Ports v1's real SellerPayoutProfileController::update() - a seller's
 * IBAN/identity/contact info, registered with iyzico as a "sub-merchant"
 * so their share of a sale lands directly in their account. If iyzico
 * isn't configured yet, the profile still saves as "pending" (matches v1
 * exactly) - once real keys are entered in the admin panel, the seller can
 * re-submit this same form to actually get onboarded.
 */
export async function updateSellerPayoutProfile(userId: number, input: UpdateSellerPayoutInput): Promise<SellerPayoutStatus> {
  const iban = input.iban.trim().replace(/\s+/g, "").toUpperCase();
  const identityNumber = input.identityNumber.trim();
  const contactName = input.contactName.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const city = input.city.trim();

  if (!iban || !identityNumber || !contactName || !phone || !address || !city) {
    throw new Error("Tüm alanları doldurmanız gerekiyor.");
  }
  if (!/^TR[0-9]{24}$/.test(iban)) {
    throw new Error("Geçersiz IBAN formatı (TR ile başlamalı, 26 hane).");
  }
  if (!/^[0-9]{11}$/.test(identityNumber)) {
    throw new Error("Geçersiz TC Kimlik No.");
  }

  const [userRow] = await db.select({ mail: user.mail }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) throw new Error("Kullanıcı bulunamadı.");

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const [existing] = await db.select({ id: sellerPayoutProfile.id }).from(sellerPayoutProfile).where(eq(sellerPayoutProfile.userId, userId)).limit(1);

  let profileId: number;
  if (existing) {
    profileId = existing.id;
    await db.update(sellerPayoutProfile).set({
      iban, identityNumber, contactName, phone, address, city, status: "pending", updatedDate: now,
    }).where(eq(sellerPayoutProfile.id, profileId));
  } else {
    const [result] = await db.insert(sellerPayoutProfile).values({
      userId, iban, identityNumber, contactName, phone, address, city, status: "pending", createdDate: now,
    });
    profileId = result.insertId;
  }

  const config = await getIyzicoConfig();
  if (!isIyzicoConfigured(config)) {
    return "pending";
  }

  try {
    const subMerchantKey = await createSubMerchant(config, {
      profileId, contactName, phone, address, iban, identityNumber, userId, userMail: userRow.mail,
    });
    await db.update(sellerPayoutProfile).set({ iyzicoSubMerchantKey: subMerchantKey, status: "active" }).where(eq(sellerPayoutProfile.id, profileId));
    return "active";
  } catch (error) {
    await db.update(sellerPayoutProfile).set({ status: "rejected" }).where(eq(sellerPayoutProfile.id, profileId));
    throw new Error(`iyzico kaydı oluşturulamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
}
