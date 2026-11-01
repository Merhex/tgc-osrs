/** Canvas helpers shared by the card, card back and pack wrapper renderers. */

export const FONT_TITLE = '"Cinzel", "Trajan Pro", Georgia, serif';
export const FONT_BODY = '"Alegreya Sans", "Segoe UI", system-ui, sans-serif';

let fontsReady: Promise<void> | null = null;

export function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady =
      typeof document === 'undefined' || !document.fonts
        ? Promise.resolve()
        : Promise.all([
            document.fonts.load(`700 40px ${FONT_TITLE}`),
            document.fonts.load(`900 40px ${FONT_TITLE}`),
            document.fonts.load(`400 30px ${FONT_BODY}`),
            document.fonts.load(`italic 400 30px ${FONT_BODY}`),
            document.fonts.load(`700 30px ${FONT_BODY}`),
          ]).then(
            () => undefined,
            () => undefined,
          );
  }
  return fontsReady;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Loads an SVG string as an image (no network involved). */
export function svgImage(key: string, svg: () => string): Promise<HTMLImageElement> {
  let p = imageCache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode artwork ${key}`));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}`;
    });
    imageCache.set(key, p);
  }
  return p;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Bevelled (chamfered) rectangle — the classic OSRS interface panel shape. */
export function chamfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws text shrinking the font until it fits. */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: (size: number) => string,
  size: number,
  min = 18,
) {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxWidth && s > min) {
    s -= 2;
    ctx.font = font(s);
  }
  ctx.fillText(text, x, y);
}

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small rune-like glyph used as decoration (original shapes, not real OSRS runes). */
export function runeGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, variant: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = 'round';
  const v = variant % 6;
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s);
  if (v === 0) {
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(s * 0.6, -s);
  } else if (v === 1) {
    ctx.moveTo(-s * 0.6, -s * 0.2);
    ctx.lineTo(s * 0.6, s * 0.2);
  } else if (v === 2) {
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.6, -s * 0.5);
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.6, -s * 0.5);
  } else if (v === 3) {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, -s * 0.4);
    ctx.lineTo(0, s * 0.1);
  } else if (v === 4) {
    ctx.moveTo(-s * 0.6, s);
    ctx.lineTo(0, s * 0.2);
    ctx.lineTo(s * 0.6, s);
  } else {
    ctx.moveTo(-s * 0.5, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.5);
    ctx.moveTo(s * 0.5, -s * 0.5);
    ctx.lineTo(-s * 0.5, s * 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

export const RARITY_COLORS: Record<string, string> = {
  Rare: '#4fa3ff',
  Epic: '#b06bff',
  Legendary: '#ffae2b',
};
