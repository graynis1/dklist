import { getNotifications, getUnreadNotificationCount, deleteNotification, deleteAllNotifications, markNotificationRead } from "@/db/queries/notifications";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.userId, 60),
    getUnreadNotificationCount(session.userId),
  ]);
  return mobileJson({ status: "ok", notifications, unreadCount });
}

export async function DELETE(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  if (idParam) {
    await deleteNotification(session.userId, Number(idParam));
  } else {
    await deleteAllNotifications(session.userId);
  }
  return mobileJson({ status: "ok" });
}

/** Marks one notification read (tapping it opens its page). */
export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return mobileJson({ status: "invalid", message: "Geçersiz bildirim." }, { status: 400 });
  }
  await markNotificationRead(session.userId, id);
  return mobileJson({ status: "ok" });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
