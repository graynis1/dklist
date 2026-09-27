export function videoThumb(id: string | null, hq = true) {
  return id ? `https://img.youtube.com/vi/${id}/${hq ? "hqdefault" : "mqdefault"}.jpg` : null;
}
