import type { CardDefinition, FrameStyle } from '../data/cards';
import { SET_NAME } from '../data/cards';
import { ART } from '../art/scenes';
import {
  chamfer,
  ensureFonts,
  fitText,
  FONT_BODY,
  FONT_TITLE,
  makeCanvas,
  RARITY_COLORS,
  roundRect,
  runeGlyph,
  seeded,
  svgImage,
  wrapText,
} from './canvasKit';

/** Card face texture size (63×88 card ratio). */
export const CARD_W = 1024;
export const CARD_H = 1430;

/** Art window in texture pixels; also used by the shader to localise effects. */
export const ART_RECT = { x: 64, y: 168, w: 896, h: 658 };

/** Art window in UV space (y up, matching CanvasTexture flipY). */
export const ART_UV = {
  x0: ART_RECT.x / CARD_W,
  x1: (ART_RECT.x + ART_RECT.w) / CARD_W,
  y0: 1 - (ART_RECT.y + ART_RECT.h) / CARD_H,
  y1: 1 - ART_RECT.y / CARD_H,
};

function paintMotif(ctx: CanvasRenderingContext2D, f: FrameStyle, seed: number) {
  const r = seeded(seed);
  const W = CARD_W;
  const H = CARD_H;
  const g = ctx.createLinearGradient(0, 0, W, H);
  switch (f.motif) {
    case 'goldFoil':
      g.addColorStop(0, '#fff0b0');
      g.addColorStop(0.25, f.base);
      g.addColorStop(0.5, '#8a6420');
      g.addColorStop(0.72, f.base);
      g.addColorStop(1, '#fff3c4');
      break;
    case 'paleFoil':
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, f.base);
      g.addColorStop(0.6, '#a9b0b9');
      g.addColorStop(1, '#f7f2e4');
      break;
    case 'silver':
      g.addColorStop(0, '#eef3f7');
      g.addColorStop(0.5, f.base);
      g.addColorStop(1, '#8a949f');
      break;
    default:
      g.addColorStop(0, f.base);
      g.addColorStop(1, f.shade);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Texture pass per motif.
  if (f.motif === 'stone' || f.motif === 'sandstone' || f.motif === 'volcanic' || f.motif === 'obsidian') {
    for (let i = 0; i < 160; i++) {
      const x = r() * W;
      const y = r() * H;
      const s = 20 + r() * 50;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y + r() * 12);
      ctx.lineTo(x + s * 0.7, y + s * 0.8);
      ctx.lineTo(x - s * 0.1, y + s * 0.6);
      ctx.closePath();
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      ctx.fill();
    }
  }
  if (f.motif === 'sandstone') {
    ctx.strokeStyle = 'rgba(90,60,25,0.25)';
    ctx.lineWidth = 3;
    for (let y = 20; y < H; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 64) ctx.lineTo(x, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
  }
  if (f.motif === 'volcanic' || f.motif === 'obsidian') {
    ctx.strokeStyle = f.accent;
    ctx.shadowColor = f.accent;
    ctx.shadowBlur = f.motif === 'volcanic' ? 14 : 6;
    ctx.lineWidth = f.motif === 'volcanic' ? 3 : 2;
    for (let i = 0; i < (f.motif === 'volcanic' ? 22 : 8); i++) {
      let x = r() * W;
      let y = r() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 70;
        y += (r() - 0.3) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  if (f.motif === 'iron') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 400; i++) ctx.fillRect(r() * W, r() * H, 2 + r() * 3, 1);
    // web motifs in the corners
    ctx.strokeStyle = 'rgba(209,43,58,0.35)';
    ctx.lineWidth = 2;
    for (const [cx, cy, sx, sy] of [
      [0, 0, 1, 1],
      [W, 0, -1, 1],
      [0, H, 1, -1],
      [W, H, -1, -1],
    ]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 4) * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sx * Math.cos(a) * 120, cy + sy * Math.sin(a) * 120);
        ctx.stroke();
      }
      for (const rr of [40, 75, 110]) {
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) {
          const a = (k / 4) * (Math.PI / 2);
          const px = cx + sx * Math.cos(a) * rr;
          const py = cy + sy * Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }
  if (f.motif === 'silver' || f.motif === 'goldFoil' || f.motif === 'paleFoil') {
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(0, r() * H, W, 1);
    }
    ctx.globalAlpha = 1;
    // diagonal foil bands with subject undertones
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * W * 1.6 - W * 0.3;
      const band = ctx.createLinearGradient(x, 0, x + 160, 160);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, i % 2 ? hexA(f.accent, 0.14) : hexA(f.accent2, 0.14));
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.5);
      ctx.fillRect(-80, -200, 160, H * 2);
      ctx.restore();
    }
  }
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function gem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Inset panel: bronze edge + dark or parchment fill. */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: 'dark' | 'parchment', c = 14) {
  chamfer(ctx, x - 6, y - 6, w + 12, h + 12, c + 4);
  ctx.fillStyle = '#2a1d10';
  ctx.fill();
  chamfer(ctx, x - 3, y - 3, w + 6, h + 6, c + 2);
  const bronze = ctx.createLinearGradient(x, y, x, y + h);
  bronze.addColorStop(0, '#d9a64a');
  bronze.addColorStop(0.5, '#8a5a22');
  bronze.addColorStop(1, '#c48c3a');
  ctx.fillStyle = bronze;
  ctx.fill();
  chamfer(ctx, x, y, w, h, c);
  if (fill === 'dark') {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3b2a1a');
    g.addColorStop(1, '#22170d');
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#efe0b9');
    g.addColorStop(1, '#d8c194');
    ctx.fillStyle = g;
  }
  ctx.fill();
}

export interface CardFaceOptions {
  /** Output scale (1 = 1024×1430). */
  scale?: number;
}

/** Renders a complete card face. Text is baked for the 3D view; the HTML panel repeats it accessibly. */
export async function renderCardFace(card: CardDefinition, opts: CardFaceOptions = {}): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const scale = opts.scale ?? 1;
  const [canvas, ctx] = makeCanvas(Math.round(CARD_W * scale), Math.round(CARD_H * scale));
  ctx.scale(scale, scale);
  const f = card.frame;
  const seed = parseInt(card.number, 10) * 97;

  // Frame
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 44);
  ctx.save();
  ctx.clip();
  paintMotif(ctx, f, seed);
  // inner bevel
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 10;
  roundRect(ctx, 22, 22, CARD_W - 44, CARD_H - 44, 30);
  ctx.stroke();
  ctx.strokeStyle = f.motif === 'goldFoil' || f.motif === 'paleFoil' ? 'rgba(255,248,220,0.7)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  roundRect(ctx, 30, 30, CARD_W - 60, CARD_H - 60, 26);
  ctx.stroke();
  ctx.restore();

  // Name plate
  panel(ctx, 56, 52, CARD_W - 112, 96, 'dark', 16);
  ctx.fillStyle = '#ffcf5a';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowOffsetY = 3;
  fitText(ctx, card.name, 84, 102, 720, (s) => `700 ${s}px ${FONT_TITLE}`, 56, 32);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8d6a8';
  ctx.font = `700 34px ${FONT_TITLE}`;
  ctx.fillText(card.number, CARD_W - 84, 102);
  ctx.shadowColor = 'transparent';

  // Art window
  const a = ART_RECT;
  chamfer(ctx, a.x - 10, a.y - 10, a.w + 20, a.h + 20, 18);
  ctx.fillStyle = '#1a120a';
  ctx.fill();
  chamfer(ctx, a.x - 5, a.y - 5, a.w + 10, a.h + 10, 14);
  ctx.fillStyle = f.accent2;
  ctx.fill();
  const img = await svgImage(card.art, ART[card.art]);
  ctx.save();
  chamfer(ctx, a.x, a.y, a.w, a.h, 12);
  ctx.clip();
  ctx.drawImage(img, a.x, a.y, a.w, a.h);
  ctx.restore();
  // corner gems
  for (const [x, y] of [
    [a.x, a.y],
    [a.x + a.w, a.y],
    [a.x, a.y + a.h],
    [a.x + a.w, a.y + a.h],
  ])
    gem(ctx, x, y, 16, f.accent);

  // Type bar: category · source + rarity label (text, not just colour)
  panel(ctx, 56, 846, CARD_W - 112, 64, 'dark', 12);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f1e2bd';
  fitText(ctx, `${card.category} · ${card.source}`, 80, 879, 600, (s) => `700 ${s}px ${FONT_BODY}`, 32, 20);
  const rc = RARITY_COLORS[card.rarity];
  ctx.textAlign = 'right';
  ctx.font = `900 30px ${FONT_TITLE}`;
  const rw = ctx.measureText(card.rarity.toUpperCase()).width;
  gem(ctx, CARD_W - 92 - rw - 24, 878, 14, rc);
  ctx.fillStyle = rc;
  ctx.fillText(card.rarity.toUpperCase(), CARD_W - 84, 880);

  // Text box
  panel(ctx, 56, 930, CARD_W - 112, 362, 'parchment', 16);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a2610';
  ctx.font = `italic 400 34px ${FONT_BODY}`;
  let y = 984;
  for (const line of wrapText(ctx, card.description, CARD_W - 180)) {
    ctx.fillText(line, 86, y);
    y += 40;
  }
  y += 12;
  ctx.strokeStyle = 'rgba(90,60,25,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(86, y);
  ctx.lineTo(CARD_W - 86, y);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = 'rgba(90,60,25,0.6)';
    runeGlyph(ctx, CARD_W / 2 - 90 + i * 30, y, 7, i + seed);
  }
  y += 42;
  ctx.fillStyle = '#7a4f1a';
  ctx.font = `700 22px ${FONT_TITLE}`;
  ctx.fillText('PROTOTYPE ABILITY', 86, y);
  y += 44;
  ctx.fillStyle = '#2a1a08';
  ctx.font = `700 38px ${FONT_BODY}`;
  ctx.fillText(card.ability.name, 86, y);
  y += 44;
  ctx.font = `400 34px ${FONT_BODY}`;
  for (const line of wrapText(ctx, card.ability.text, CARD_W - 180)) {
    ctx.fillText(line, 86, y);
    y += 40;
  }

  // Footer
  ctx.textAlign = 'left';
  ctx.fillStyle =
    f.motif === 'paleFoil' || f.motif === 'silver' || f.motif === 'goldFoil' || f.motif === 'sandstone' ? '#2a1d10' : '#e8d6a8';
  ctx.font = `700 24px ${FONT_TITLE}`;
  ctx.fillText(`${card.number}/010 · ${SET_NAME}`, 70, 1336);
  ctx.font = `400 20px ${FONT_BODY}`;
  ctx.fillText('Unofficial fan card · not affiliated with Jagex', 70, 1372);
  ctx.textAlign = 'right';
  ctx.font = `900 24px ${FONT_TITLE}`;
  ctx.fillStyle = rc;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 4;
  ctx.strokeText(card.rarity.charAt(0), CARD_W - 70, 1352);
  ctx.fillText(card.rarity.charAt(0), CARD_W - 70, 1352);

  return canvas;
}

/** Shared designed card back used across the whole set. */
export async function renderCardBack(scale = 1): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const [canvas, ctx] = makeCanvas(Math.round(CARD_W * scale), Math.round(CARD_H * scale));
  ctx.scale(scale, scale);
  const W = CARD_W;
  const H = CARD_H;
  roundRect(ctx, 0, 0, W, H, 44);
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H * 0.7);
  g.addColorStop(0, '#5a3a1c');
  g.addColorStop(1, '#1e130a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = seeded(4242);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,220,160,0.035)' : 'rgba(0,0,0,0.08)';
    const x = r() * W;
    const y = r() * H;
    const s = 20 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y + r() * 20);
    ctx.lineTo(x + s * 0.6, y + s);
    ctx.closePath();
    ctx.fill();
  }
  // bronze borders
  for (const [inset, color, width] of [
    [26, '#2a1a0c', 16],
    [30, '#c48c3a', 6],
    [56, '#8a5a22', 3],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    chamfer(ctx, inset, inset, W - inset * 2, H - inset * 2, 40);
    ctx.stroke();
  }
  // Rune ring
  const cx = W / 2;
  const cy = H / 2;
  ctx.strokeStyle = '#d9a64a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 300, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 258, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f2cf6e';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 279, cy + Math.sin(a) * 279);
    ctx.rotate(a + Math.PI / 2);
    runeGlyph(ctx, 0, 0, 11, i);
    ctx.restore();
  }
  // Central emblem: crossed weapons silhouettes as a stylised star
  ctx.fillStyle = '#2a1a0c';
  ctx.beginPath();
  ctx.arc(cx, cy, 230, 0, Math.PI * 2);
  ctx.fill();
  const star = (rad: number, inner: number, color: string, points = 8) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? inner : rad;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  star(210, 90, '#8a5a22');
  star(180, 70, '#d9a64a', 4);
  star(110, 40, '#ffe39a', 4);
  ctx.fillStyle = '#2a1a0c';
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf5a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 40px ${FONT_TITLE}`;
  ctx.fillText('G', cx, cy + 2);
  // Titles
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowOffsetY = 4;
  ctx.font = `900 92px ${FONT_TITLE}`;
  ctx.fillStyle = '#ffcf5a';
  ctx.fillText('LEGENDS', cx, 250);
  ctx.font = `700 54px ${FONT_TITLE}`;
  ctx.fillText('& LOOT', cx, 330);
  ctx.font = `700 34px ${FONT_TITLE}`;
  ctx.fillStyle = '#e8d6a8';
  ctx.fillText('GIELINOR', cx, H - 260);
  ctx.shadowColor = 'transparent';
  ctx.font = `400 22px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(232,214,168,0.7)';
  ctx.fillText('Unofficial fan project · not affiliated with Jagex', cx, H - 110);
  ctx.restore();
  return canvas;
}
