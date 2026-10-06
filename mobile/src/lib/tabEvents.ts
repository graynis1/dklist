/** Tiny pub/sub for "the active tab was tapped again" (scroll to top). */
type Listener = (href: string) => void;
const listeners = new Set<Listener>();

export function onTabReselect(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitTabReselect(href: string) {
  listeners.forEach((fn) => fn(href));
}
