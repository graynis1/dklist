"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { shipOrder, completeOrder, cancelOrder, refundOrder } from "@/db/queries/store-order";

async function requireUser(): Promise<{ id: number; isElevated: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Giriş yapmalısınız.");
  return { id: Number(session.user.id), isElevated: hasRole(session.user.userType, [USER_TYPES.Admin, USER_TYPES.Mod]) };
}

export async function shipOrderAction(orderId: number, trackingNumber?: string): Promise<{ status: boolean; message?: string }> {
  try {
    const { id, isElevated } = await requireUser();
    await shipOrder(id, isElevated, orderId, trackingNumber);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "İşlem başarısız." };
  }
}

export async function completeOrderAction(orderId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const { id, isElevated } = await requireUser();
    await completeOrder(id, isElevated, orderId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "İşlem başarısız." };
  }
}

export async function cancelOrderAction(orderId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const { id } = await requireUser();
    await cancelOrder(id, orderId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "İşlem başarısız." };
  }
}

export async function refundOrderAction(orderId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const { id, isElevated } = await requireUser();
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
    await refundOrder(id, isElevated, orderId, ip);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "İşlem başarısız." };
  }
}
