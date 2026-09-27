let dirty = false;

export function markBlogDirty() {
  dirty = true;
}

export function consumeBlogDirty(): boolean {
  const was = dirty;
  dirty = false;
  return was;
}
