import { getNotifications, getUnreadNotificationCount, deleteNotification, deleteAllNotifications } from "@/db/queries/notifications";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.userId),
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

export async function OPTIONS() {
  return mobileCorsPreflight();
}
