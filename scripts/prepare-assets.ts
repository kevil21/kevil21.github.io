/**
 * Asset pipeline: assets-source/* → public/images/derived/<id>-<w>.{avif,webp,jpg} + src/lib/assets.generated.json.
 * EXIF is stripped (sharp does not copy metadata unless asked). Logos are converted to PNG with
 * transparency preserved. Also renders the OG image, favicons and the manifest icons from the brand.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SRC = new URL('../assets-source/', import.meta.url).pathname;
const OUT = new URL('../public/images/derived/', import.meta.url).pathname;
const OG = new URL('../public/og/', import.meta.url).pathname;
const PUB = new URL('../public/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
mkdirSync(OG, { recursive: true });

const WIDTHS = [320, 640, 960];
const manifest: Record<
  string,
  { width: number; height: number; variants: { w: number; avif: string; webp: string; jpg: string }[] }
> = {};

for (const file of readdirSync(SRC).sort()) {
  const ext = extname(file).toLowerCase();
  const id = basename(file, ext).toLowerCase();
  const input = join(SRC, file);
  if (ext === '.png') {
    // brand logos: keep as PNG at two sizes
    for (const w of [160, 320]) {
      await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toFile(join(OUT, `${id}-${w}.png`));
    }
    const meta = await sharp(input).metadata();
    manifest[id] = { width: meta.width ?? 0, height: meta.height ?? 0, variants: [] };
    continue;
  }
  if (!['.jpg', '.jpeg'].includes(ext)) continue;
  const meta = await sharp(input).metadata();
  const variants: { w: number; avif: string; webp: string; jpg: string }[] = [];
  for (const w of WIDTHS) {
    const base = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    await base
      .clone()
      .avif({ quality: 55 })
      .toFile(join(OUT, `${id}-${w}.avif`));
    await base
      .clone()
      .webp({ quality: 78 })
      .toFile(join(OUT, `${id}-${w}.webp`));
    await base
      .clone()
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(join(OUT, `${id}-${w}.jpg`));
    variants.push({
      w,
      avif: `/images/derived/${id}-${w}.avif`,
      webp: `/images/derived/${id}-${w}.webp`,
      jpg: `/images/derived/${id}-${w}.jpg`,
    });
  }
  const scale = Math.min(1, WIDTHS[WIDTHS.length - 1]! / (meta.width ?? 1));
  manifest[id] = {
    width: Math.round((meta.width ?? 0) * scale),
    height: Math.round((meta.height ?? 0) * scale),
    variants,
  };
}

writeFileSync(
  new URL('../src/lib/assets.generated.json', import.meta.url).pathname,
  JSON.stringify(manifest, null, 2),
);

/* ---------- brand renders (OG image, icons) ---------- */
const INK = '#15171f';
const PAPER = '#f8f6f1';
const SIGNAL = '#f2b24a';
const TEAL = '#7cc8d6';
const headshot = existsSync(join(SRC, 'headshot.jpg'))
  ? await sharp(join(SRC, 'headshot.jpg'))
      .resize(280, 280)
      .composite([
        {
          input: Buffer.from(
            `<svg width="280" height="280"><rect width="280" height="280" rx="28" ry="28"/></svg>`,
          ),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer()
  : null;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${INK}"/>
  <g stroke="${TEAL}" stroke-width="2" fill="none" opacity="0.5">
    <path d="M0 520 C120 520 160 470 260 470 S420 540 520 540 S640 430 760 430 S900 500 1020 500 S1140 440 1200 440"/>
    <path d="M0 560 C140 560 180 520 300 520 S460 580 580 580 S700 500 820 500 S940 560 1060 560 S1160 520 1200 520"/>
  </g>
  <path d="M0 480 C100 480 150 400 240 400 S380 470 480 470 S600 330 720 330 S860 420 980 420 S1120 300 1200 300" stroke="${SIGNAL}" stroke-width="4" fill="none"/>
  <text x="72" y="140" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="${TEAL}" letter-spacing="4">TRACE · KEVILPATEL.IN</text>
  <text x="72" y="250" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="700" fill="${PAPER}">Kevil Patel</text>
  <text x="72" y="310" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="${PAPER}" opacity="0.85">Associate Software Development Engineer · Kyndryl</text>
  <text x="72" y="360" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${SIGNAL}">Building agentic AI on cloud — every claim linked to its evidence.</text>
</svg>`;
const og = sharp(Buffer.from(ogSvg));
await (headshot ? og.composite([{ input: headshot, left: 1200 - 72 - 280, top: 96 }]) : og)
  .png()
  .toFile(join(OG, 'default.png'));

const iconSvg = (
  size: number,
  bg: string,
  fg: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
  <rect width="28" height="28" rx="6" fill="${bg}"/>
  <path d="M4 20h6l3-12 4 12h7" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
writeFileSync(
  join(PUB, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><style>path{stroke:${INK}}rect{fill:${SIGNAL}}@media(prefers-color-scheme:dark){rect{fill:${SIGNAL}}path{stroke:${INK}}}</style><rect width="28" height="28" rx="6"/><path d="M4 20h6l3-12 4 12h7" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
);
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
] as const) {
  const pad = name.includes('maskable') ? 0.1 : 0;
  const inner = Math.round(size * (1 - 2 * pad));
  const img = sharp(Buffer.from(iconSvg(inner, SIGNAL, INK))).png();
  if (pad) {
    await sharp({ create: { width: size, height: size, channels: 4, background: SIGNAL } })
      .composite([{ input: await img.toBuffer(), left: Math.round(size * pad), top: Math.round(size * pad) }])
      .png()
      .toFile(join(PUB, name));
  } else await img.toFile(join(PUB, name));
}
await sharp(Buffer.from(iconSvg(32, SIGNAL, INK)))
  .png()
  .toFile(join(PUB, 'favicon-32.png'));
// .ico: browsers accept PNG payload named favicon.ico; keep a true PNG under the name for simplicity.
await sharp(Buffer.from(iconSvg(32, SIGNAL, INK)))
  .png()
  .toFile(join(PUB, 'favicon.ico'));

console.info(
  `✓ assets: ${Object.keys(manifest).length} sources → ${readdirSync(OUT).length} derived files, OG image, icons`,
);
