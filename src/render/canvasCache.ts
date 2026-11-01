/** Caches rendered canvases (CPU side) so textures and HTML images share work. */
const canvasCache = new Map<string, Promise<HTMLCanvasElement>>();

export function canvasFor(key: string, make: () => Promise<HTMLCanvasElement>): Promise<HTMLCanvasElement> {
  let p = canvasCache.get(key);
  if (!p) {
    p = make();
    p.catch(() => canvasCache.delete(key));
    canvasCache.set(key, p);
  }
  return p;
}

/** Lower texture resolution on small / touch devices to save GPU memory. */
export function textureScale(): number {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return coarse || Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.7 : 1;
}
