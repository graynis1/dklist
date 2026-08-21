import "server-only";
import { EventEmitter } from "node:events";

/**
 * Gerçek-zamanlı bildirim (SSE) - thirteenth and final item from the "what
 * else could be added" brainstorm list. This app runs as a long-lived
 * Node process on the VPS (Phase 0's own hosting decision - `next start`,
 * not serverless), so a plain in-process EventEmitter is a real, correct
 * pub/sub mechanism here - it would NOT be on a serverless deployment
 * (each invocation is a separate process with no shared memory), but that
 * constraint doesn't apply to this app's actual architecture. No Redis/
 * external pub-sub needed for a single-instance deployment.
 */
// Stored on globalThis rather than plain module scope - a real bug caught
// via testing: Next.js bundles route handlers, Server Actions, and Server
// Components into separate compiled chunks, each getting its OWN copy of
// an ordinary module-scope singleton (confirmed by adding debug logging:
// subscribe()/publish() were operating on two different EventEmitter
// instances, so publish() always saw zero listeners even though a real
// subscriber was connected). globalThis is genuinely shared across all of
// a Node process's module graphs, which a plain `const bus = new
// EventEmitter()` at module scope is not guaranteed to be.
const g = globalThis as unknown as { __dklistEventBus?: EventEmitter };
if (!g.__dklistEventBus) {
  g.__dklistEventBus = new EventEmitter();
  // Many concurrent SSE connections (one listener per open tab) is the
  // expected normal case, not a leak - raise the default cap so Node's own
  // "possible EventEmitter memory leak" warning doesn't fire on ordinary use.
  g.__dklistEventBus.setMaxListeners(500);
}
const bus = g.__dklistEventBus;

export type RealtimeEventType = "notification" | "message";

export function publishUserEvent(userId: number, type: RealtimeEventType): void {
  bus.emit(`user:${userId}`, type);
}

export function subscribeUserEvents(userId: number, listener: (type: RealtimeEventType) => void): () => void {
  const channel = `user:${userId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
