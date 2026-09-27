let dirty = false;

/** Set by screens that create feed content; Akış consumes it on focus. */
export function markFeedDirty() {
  dirty = true;
}

export function consumeFeedDirty(): boolean {
  const was = dirty;
  dirty = false;
  return was;
}
