/**
 * Build-time image pipeline (prebuild): assets-source/* → public/images/derived/<name>-<w>.{avif,webp,jpg|png}.
 * Deterministic output names so templates can reference them without a manifest. Skips files that are up to date.
 */
import sharp, { type Sharp } from 'sharp';
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'assets-source');
const OUT = join(ROOT, 'public', 'images', 'derived');

const WIDTHS: Record<string, number[]> = {
  headshot: [160, 320, 640],
  portrait: [480, 960],
  photo1: [480, 960],
  photo2: [480, 960],
  photo3: [480, 960],
  'logo-aws': [120, 240],
  'logo-founderz': [96, 192],
};

mkdirSync(OUT, { recursive: true });
let written = 0;
let skipped = 0;
for (const file of readdirSync(SRC)) {
  const { name, ext } = parse(file);
  const widths = WIDTHS[name];
  if (!widths) continue;
  const src = join(SRC, file);
  const srcTime = statSync(src).mtimeMs;
  const isPng = ext.toLowerCase() === '.png';
  for (const w of widths) {
    const base = `${name}-${w}`;
    const targets: Array<[string, (s: Sharp) => Sharp]> = [
      [`${base}.avif`, (s) => s.avif({ quality: 60 })],
      [`${base}.webp`, (s) => s.webp({ quality: 82 })],
      isPng
        ? [`${base}.png`, (s) => s.png({ compressionLevel: 9 })]
        : [`${base}.jpg`, (s) => s.jpeg({ quality: 84, mozjpeg: true })],
    ];
    for (const [out, encode] of targets) {
      const dest = join(OUT, out);
      if (existsSync(dest) && statSync(dest).mtimeMs >= srcTime) {
        skipped++;
        continue;
      }
      await encode(sharp(src).resize({ width: w, withoutEnlargement: true })).toFile(dest);
      written++;
    }
  }
}
console.log(`✔ images: ${written} written, ${skipped} up to date → public/images/derived/`);

// ---- Icons and the OG image (rasterised from SVG; colours mirror the dark tokens as sRGB) ----
const ICON_SVG = (
  size: number,
  maskable = false,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <rect width="64" height="64" rx="${maskable ? 0 : 12}" fill="#0f141c"/>
  <circle cx="32" cy="18" r="6" fill="#f3a52b"/>
  <path d="M14 46V30h36v16M20 46V36h8v10M36 46V36h8v10M10 46h44" fill="none" stroke="#ffc667" stroke-width="3" stroke-linecap="round"/>
</svg>`;
const ICONS = join(ROOT, 'public', 'icons');
mkdirSync(ICONS, { recursive: true });
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
] as const) {
  await sharp(Buffer.from(ICON_SVG(size, maskable)))
    .png()
    .toFile(join(ICONS, name));
}
await sharp(Buffer.from(ICON_SVG(180)))
  .png()
  .toFile(join(ROOT, 'public', 'apple-touch-icon.png'));

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const OG_SVG = (
  title: string,
  subtitle: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0f141c"/>
  <rect x="0" y="560" width="1200" height="70" fill="#181d26"/>
  ${[160, 400, 640, 880].map((x) => `<circle cx="${x}" cy="96" r="14" fill="#f3a52b"/><path d="M${x - 40} 110 L${x + 40} 110 L${x + 28} 80 L${x - 28} 80 Z" fill="#2a2f3a"/>`).join('')}
  <text x="80" y="300" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#f4f1ea">${esc(title)}</text>
  <text x="80" y="370" font-family="Menlo, Consolas, monospace" font-size="28" fill="#ffc667">${esc(subtitle)}</text>
  <text x="80" y="470" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#b9b4a9">A laboratory floor of working machines · sample data · every fact sourced</text>
  <text x="80" y="605" font-family="Menlo, Consolas, monospace" font-size="24" fill="#8f8c83">kevilpatel.in</text>
</svg>`;
const OG = join(ROOT, 'public', 'og');
mkdirSync(OG, { recursive: true });
await sharp(
  Buffer.from(
    OG_SVG(
      'Kevil Patel — The Simulation Room',
      'Associate Software Development Engineer · Kyndryl · agentic AI on cloud',
    ),
  ),
)
  .png()
  .toFile(join(OG, 'default.png'));
console.log('✔ icons (192, 512, maskable, apple-touch) and og/default.png written');
