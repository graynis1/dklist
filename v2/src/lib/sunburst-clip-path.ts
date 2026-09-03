/**
 * Generates a scalloped star/gear silhouette (a percentage-based CSS
 * `clip-path: polygon(...)` around a 0-100% box) - the "break out of the
 * circle" halo rendered behind tier 3+ `ProfileFrameRing`s
 * (`src/components/dklist/profile-frame-ring.tsx`). `spikes` alternates an
 * outer point and an inner valley `spikes` times around the circle, starting
 * straight up (12 o'clock) so the shape sits symmetrically under the ring.
 *
 * Extracted to its own pure module (previously private inside
 * profile-frame-ring.tsx) so this geometry - which has already gone through
 * several rounds of pointed customer feedback on the frame's visual shape -
 * has real regression coverage independent of rendering the component.
 */
export function sunburstClipPath(spikes: number, innerRatio: number): string {
  const total = spikes * 2;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 50 * innerRatio;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}
