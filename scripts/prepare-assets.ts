import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { portfolio } from '../src/lib/content.ts';
import { sha256, stableStringify } from '../src/lib/knowledge.ts';

const input = new URL('../assets-source/headshot.jpg', import.meta.url);
const output = new URL('../public/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const original = await readFile(input);
const themes = await readFile(new URL('../src/styles/themes.css', import.meta.url), 'utf8');
const color = (token: string): string => {
  const match = themes.match(new RegExp(`--${token}:\\s*light-dark\\((#[a-f0-9]+),`, 'i'));
  if (!match?.[1]) throw new Error(`Missing light-theme artwork color: ${token}`);
  return match[1];
};
const xmlEntities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (value: string): string => value.replace(/[&<>"']/g, (character) => xmlEntities[character] ?? character);
const headshots: { src: string; width: number; height: number; bytes: number; format: string }[] = [];
for (const width of [160, 480, 960]) {
  for (const format of ['webp', 'jpeg'] as const) {
    const extension = format === 'jpeg' ? 'jpg' : 'webp';
    const name = `headshot-${width}.${extension}`;
    // No crop, face alteration, enlargement, or metadata retention.
    const { data, info } = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).toFormat(format, { quality: format === 'webp' ? 82 : 86 }).toBuffer({ resolveWithObject: true });
    await writeFile(new URL(name, output), data);
    headshots.push({ src: `/assets/${name}`, width: info.width, height: info.height, bytes: info.size, format: extension });
  }
}

// An abstract initial mark, not a synthetic photograph. Palette comes only from themes.css.
const icon = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${color('bg')}"/><path d="M130 128v256m0-128 110-128M130 256l110 128M300 384V128h46a70 70 0 0 1 0 140h-46" fill="none" stroke="${color('accent')}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
for (const [name, width] of [['favicon.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]] as const) {
  await sharp(icon).resize(width, width).png().toFile(fileURLToPath(new URL(name, output)));
}
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${color('bg')}"/><rect x="64" y="72" width="12" height="480" rx="6" fill="${color('accent')}"/><text x="110" y="250" font-family="sans-serif" font-size="72" fill="${color('text')}">${xml(portfolio.profile.name)}</text><text x="110" y="330" font-family="sans-serif" font-size="30" fill="${color('muted')}">${xml(portfolio.profile.role)}</text><text x="110" y="480" font-family="sans-serif" font-size="24" fill="${color('accent')}">kevilpatel.in</text></svg>`);
await sharp(og).png().toFile(fileURLToPath(new URL('og.png', output)));
await sharp(og).resize(640, 336).png().toFile(fileURLToPath(new URL('card.png', output)));
await writeFile(new URL('../src/lib/assets.generated.json', import.meta.url), stableStringify({ sourceHash: sha256(original), headshots, og: { src: '/assets/og.png', width: 1200, height: 630 }, card: { src: '/assets/card.png', width: 640, height: 336 } }));
await writeFile(new URL('../public/manifest.webmanifest', import.meta.url), stableStringify({
  id: '/', name: `${portfolio.profile.name} — Portfolio`, short_name: portfolio.profile.name,
  description: portfolio.profile.summary, lang: 'en', start_url: '/', scope: '/', display: 'standalone',
  background_color: color('bg'), theme_color: color('bg'),
  icons: [192, 512].map((size) => ({ src: `/assets/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })),
}));
console.info(`Prepared ${headshots.length} headshot derivatives, social cards, icons, and manifest from project-local inputs.`);