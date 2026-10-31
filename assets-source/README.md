# Asset input

`headshot.jpg` is the byte-preserved, user-authorized copy of the supplied photographic headshot. This directory is a build input, never a public output directory. Do not replace it with a synthetic portrait.

`npm run assets` rotates using source orientation, preserves the full frame, strips metadata, and generates responsive WebP/JPEG files using Sharp. Builds read only this project's copy, never sibling directories. Public derivative dimensions are recorded in `src/lib/assets.generated.json`.