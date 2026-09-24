import { getConversations, getMessageRequests } from "@/db/queries/messages";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const [conversations, requests] = await Promise.all([
    getConversations(session.userId),
    getMessageRequests(session.userId),
  ]);

  return mobileJson({ status: "ok", conversations, requests });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
