// Renders public/icons/favicon.svg to the PNG icons used by the PWA manifest.
// Requires Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default);
}

const root = resolve(import.meta.dirname, '..');
const svg = readFileSync(resolve(root, 'public/icons/favicon.svg'), 'utf8');
const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.12 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#1e130a;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: resolve(root, 'public/icons', t.file), omitBackground: false });
  console.log('wrote', t.file);
}
await browser.close();
