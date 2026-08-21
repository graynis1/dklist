import { auth } from "@/auth";
import { subscribeUserEvents } from "@/lib/event-bus";

/**
 * Gerçek-zamanlü bildirim (SSE) - final item from the "what else could be
 * added" brainstorm list. Real Server-Sent Events, not polling: works
 * because this app is a long-lived Node process (see event-bus.ts's doc
 * comment), so a genuinely open, held-open connection per browser tab is
 * cheap and correct here.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type })}\n\n`));
      };

      unsubscribe = subscribeUserEvents(userId, send);

      // Keeps the connection alive through intermediary proxies (real
      // deployment sits behind Cloudflare + Caddy, both of which can time
      // out an idle connection) - an SSE comment line, not a real event.
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
