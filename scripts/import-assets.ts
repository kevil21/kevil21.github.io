/**
 * One-time import of the publishable KPOS assets into assets-source/ with ALL metadata stripped (photo1/photo2 carry
 * GPS EXIF in KPOS). Excluded by the fact ledger: tree.jpg, og.svg, the .docx. Run: `npx tsx scripts/import-assets.ts`.
 * assets-source/ is committed; public/images/derived/ is generated at build by prepare-assets.ts.
 */
import sharp from 'sharp';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const KPOS_ASSETS = join(ROOT, '..', 'KPOS', 'site', 'assets');
const OUT = join(ROOT, 'assets-source');

const PUBLISHABLE = [
  { from: 'headshot.jpg', to: 'headshot.jpg' },
  { from: 'portrait.jpg', to: 'portrait.jpg' },
  { from: 'photo1.jpg', to: 'photo1.jpg' },
  { from: 'photo2.jpg', to: 'photo2.jpg' },
  { from: 'photo3.jpg', to: 'photo3.jpg' },
  { from: 'AWS.png', to: 'logo-aws.png' },
  { from: 'Founderz.png', to: 'logo-founderz.png' },
];

mkdirSync(OUT, { recursive: true });
for (const { from, to } of PUBLISHABLE) {
  const src = join(KPOS_ASSETS, from);
  if (!existsSync(src)) {
    console.error(`missing ${src}`);
    process.exit(1);
  }
  const img = sharp(src).rotate(); // apply EXIF orientation, then drop EXIF entirely (no .withMetadata())
  const meta = await img.metadata();
  const out = join(OUT, to);
  if (to.endsWith('.png')) await img.png({ compressionLevel: 9 }).toFile(out);
  else await img.jpeg({ quality: 92, mozjpeg: true }).toFile(out);
  const after = await sharp(out).metadata();
  console.log(
    `${from} → assets-source/${to}  ${meta.width}×${meta.height}  exif:${meta.exif ? 'yes' : 'no'} → ${after.exif ? 'KEPT' : 'stripped'}  ${statSync(out).size} B`,
  );
  if (after.exif) {
    console.error('metadata survived; aborting');
    process.exit(1);
  }
}
console.log('✔ assets imported with metadata stripped');
