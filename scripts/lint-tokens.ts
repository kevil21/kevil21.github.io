/**
 * Theme contract test (prompt §4): fails on any literal colour outside the token files.
 * Scans src/ (css, astro, ts, tsx, glsl, wgsl, svg) for hex colours, rgb()/hsl()/oklch()/oklab()/color() functions and
 * named CSS colours used as values. Allowed only in src/styles/tokens/*.css. `currentColor`, `transparent`, `inherit`
 * and `none` are not colours for this purpose.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const ALLOWED_DIR = join(SRC, 'styles', 'tokens');
const EXT = new Set(['.css', '.astro', '.ts', '.tsx', '.glsl', '.wgsl', '.svg', '.mjs', '.js']);

const NAMED = [
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'gray',
  'grey',
  'cyan',
  'magenta',
  'teal',
  'navy',
  'maroon',
  'olive',
  'lime',
  'aqua',
  'silver',
  'gold',
  'brown',
  'beige',
  'ivory',
  'violet',
  'indigo',
  'coral',
  'salmon',
  'tomato',
  'crimson',
  'khaki',
  'tan',
  'wheat',
  'plum',
  'orchid',
];

const PATTERNS: Array<{ name: string; re: RegExp; ext?: Set<string> }> = [
  { name: 'hex colour', re: /(?<![\w&#/])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?![\w-])/g },
  { name: 'colour function', re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g },
  {
    // Named colours are only colours in CSS-like contexts; TypeScript uses semantic tone names ('teal', 'amber').
    name: 'named colour',
    re: new RegExp(`(?<=[:\\s(,'"])(${NAMED.join('|')})(?=[;\\s)'",])`, 'g'),
    ext: new Set(['.css', '.astro', '.svg', '.glsl', '.wgsl']),
  },
];

// Lines that legitimately mention colour syntax without being a colour value.
const LINE_ALLOW = [
  /^\s*(\/\/|\*|\/\*)/, // comments
  /parse(Oklch|CssColor)|OKLCH_RE|oklchToHex|tokenIn\(|RegExp\(/, // the parser and the build-time meta reader
  /url\(/, // asset urls with # fragments
  /#L\d+/, // source pointers like #L481
  /aria-|data-|href=|id=|class=|console\./, // ids, anchors, log lines
  /tokenCss|`rgba\(\$\{/, // the bridge's rgba() string builder
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(p))) out.push(p);
  }
  return out;
}

export interface Violation {
  file: string;
  line: number;
  kind: string;
  text: string;
}

export function lintTokens(srcDir = SRC, allowedDir = ALLOWED_DIR): Violation[] {
  const violations: Violation[] = [];
  for (const file of walk(srcDir)) {
    if (file.startsWith(allowedDir)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (LINE_ALLOW.some((re) => re.test(line))) return;
      for (const { name, re, ext } of PATTERNS) {
        if (ext && !ext.has(extname(file))) continue;
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m)
          violations.push({
            file: relative(ROOT, file),
            line: i + 1,
            kind: name,
            text: line.trim().slice(0, 120),
          });
      }
    });
  }
  return violations;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  const v = lintTokens();
  if (v.length) {
    console.error(`✖ ${v.length} literal colour(s) outside src/styles/tokens:`);
    for (const x of v) console.error(`  ${x.file}:${x.line} [${x.kind}] ${x.text}`);
    process.exit(1);
  }
  console.log('✔ tokens: no literal colours outside src/styles/tokens');
}
