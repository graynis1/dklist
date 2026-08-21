import { auth } from "@/auth";
import { exportUserData } from "@/db/queries/data-export";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Giriş yapmalısınız.", { status: 401 });
  }

  const data = await exportUserData(Number(session.user.id));
  const safeUsername = (session.user.name ?? "kullanici").replace(/[^a-zA-Z0-9_-]/g, "");

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dklist-verilerim-${safeUsername}.json"`,
    },
  });
}
