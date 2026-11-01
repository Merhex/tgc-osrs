import { scytheOfVitur, tumekensShadow, twistedBow } from '../art/items';
import { CARDS, SET_NAME } from '../data/cards';
import { chamfer, ensureFonts, FONT_BODY, FONT_TITLE, makeCanvas, runeGlyph, seeded, svgImage } from './canvasKit';

export const PACK_TEX_W = 1024;
export const PACK_TEX_H = 1468;

function weaponsSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-400 -340 800 720" width="1600" height="1400">
    <defs><radialGradient id="g" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <circle cx="0" cy="-10" r="330" fill="url(#g)"/>
    <g transform="translate(-170 30) rotate(-22) scale(1.18)">${twistedBow()}</g>
    <g transform="translate(190 60) rotate(18) scale(1.12)">${scytheOfVitur()}</g>
    <g transform="translate(0 40) scale(1.22)">${tumekensShadow()}</g>
  </svg>`;
}

function foilBackground(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#3a2a14');
  g.addColorStop(0.35, '#1c1410');
  g.addColorStop(0.65, '#2a1c10');
  g.addColorStop(1, '#4a3418');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Sunburst
  ctx.save();
  ctx.translate(w / 2, h * 0.48);
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-40, -h);
    ctx.lineTo(40, -h);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(255,200,110,0.07)' : 'rgba(255,255,255,0.02)';
    ctx.fill();
  }
  ctx.restore();
  // Faceted foil
  const r = seeded(seed);
  for (let i = 0; i < 220; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = 30 + r() * 80;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y + r() * 30);
    ctx.lineTo(x + s * 0.4, y + s);
    ctx.closePath();
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,230,170,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fill();
  }
}

function border(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#c48c3a';
  ctx.lineWidth = 10;
  chamfer(ctx, 34, 30, w - 68, h - 60, 40);
  ctx.stroke();
  ctx.strokeStyle = '#ffdf8a';
  ctx.lineWidth = 3;
  chamfer(ctx, 50, 46, w - 100, h - 92, 34);
  ctx.stroke();
  ctx.strokeStyle = '#e2b24a';
  for (let i = 0; i < 18; i++) {
    runeGlyph(ctx, 90 + i * ((w - 180) / 17), 72, 10, i);
    runeGlyph(ctx, 90 + i * ((w - 180) / 17), h - 72, 10, i + 3);
  }
}

export async function renderPackFront(): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const [canvas, ctx] = makeCanvas(W, H);
  foilBackground(ctx, W, H, 9);
  border(ctx, W, H);
  const img = await svgImage('pack-weapons', weaponsSvg);
  ctx.drawImage(img, 32, 300, W - 64, (W - 64) * (720 / 800));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 8;
  const gold = ctx.createLinearGradient(0, 130, 0, 300);
  gold.addColorStop(0, '#fff2b8');
  gold.addColorStop(0.5, '#f0c050');
  gold.addColorStop(1, '#b07a22');
  ctx.fillStyle = gold;
  ctx.font = `900 132px ${FONT_TITLE}`;
  ctx.fillText('LEGENDS', W / 2, 180);
  ctx.font = `700 92px ${FONT_TITLE}`;
  ctx.fillText('& LOOT', W / 2, 282);
  // Bottom banner
  ctx.shadowBlur = 0;
  chamfer(ctx, 120, H - 290, W - 240, 120, 24);
  ctx.fillStyle = '#2a1a0c';
  ctx.fill();
  ctx.strokeStyle = '#d9a64a';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#ffcf5a';
  ctx.font = `700 64px ${FONT_TITLE}`;
  ctx.fillText('— 10 Cards —', W / 2, H - 228);
  ctx.shadowColor = 'transparent';
  ctx.font = `700 34px ${FONT_TITLE}`;
  ctx.fillStyle = '#e8d6a8';
  ctx.fillText(SET_NAME, W / 2, H - 132);
  ctx.font = `400 24px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(232,214,168,0.75)';
  ctx.fillText('Unofficial fan project · not affiliated with Jagex', W / 2, H - 96);
  return canvas;
}

export async function renderPackBack(): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const [canvas, ctx] = makeCanvas(W, H);
  foilBackground(ctx, W, H, 21);
  border(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffcf5a';
  ctx.font = `900 64px ${FONT_TITLE}`;
  ctx.fillText('Legends & Loot', W / 2, 170);
  ctx.font = `700 30px ${FONT_TITLE}`;
  ctx.fillStyle = '#e8d6a8';
  ctx.fillText(SET_NAME, W / 2, 226);

  // Parchment checklist panel
  chamfer(ctx, 110, 290, W - 220, 780, 24);
  ctx.fillStyle = '#e6d3a6';
  ctx.fill();
  ctx.strokeStyle = '#8a5a22';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a2610';
  ctx.font = `700 34px ${FONT_TITLE}`;
  ctx.fillText('Set checklist', 150, 340);
  ctx.font = `400 30px ${FONT_BODY}`;
  CARDS.forEach((c, i) => {
    const y = 400 + i * 62;
    ctx.fillStyle = '#3a2610';
    ctx.fillText(`${c.number}  ${c.name}`, 150, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = c.rarity === 'Legendary' ? '#a0600a' : c.rarity === 'Epic' ? '#6a2fb0' : '#1d5fa8';
    ctx.font = `700 26px ${FONT_TITLE}`;
    ctx.fillText(c.rarity, W - 150, y);
    ctx.textAlign = 'left';
    ctx.font = `400 30px ${FONT_BODY}`;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1e2bd';
  ctx.font = `700 34px ${FONT_BODY}`;
  ctx.fillText('Each pack: 10 cards · final card always Legendary', W / 2, 1130);
  ctx.font = `400 26px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(241,226,189,0.8)';
  ctx.fillText('Prototype odds for this fan game — not OSRS drop rates.', W / 2, 1180);
  // Rune "barcode"
  ctx.strokeStyle = '#e2b24a';
  for (let i = 0; i < 16; i++) runeGlyph(ctx, 240 + i * 36, 1270, 14, i * 7);
  ctx.font = `400 24px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(232,214,168,0.75)';
  ctx.fillText('Unofficial fan project; not affiliated with Jagex.', W / 2, H - 120);
  ctx.fillText('Old School RuneScape is a trademark of Jagex Ltd.', W / 2, H - 88);
  return canvas;
}

/** Crimped seam texture: tight ridges in metallic foil. */
export function renderCrimp(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 64);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#6a4c22');
  g.addColorStop(0.5, '#c8963c');
  g.addColorStop(1, '#6a4c22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 64);
  for (let x = 0; x < 512; x += 8) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, 0, 3, 64);
    ctx.fillStyle = 'rgba(255,240,200,0.25)';
    ctx.fillRect(x + 4, 0, 2, 64);
  }
  return canvas;
}
