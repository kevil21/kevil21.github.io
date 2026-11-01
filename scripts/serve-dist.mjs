#!/usr/bin/env node
/**
 * Minimal static server for dist/ that behaves like GitHub Pages: directory → index.html, missing → 404.html with
 * status 404, extensionless files (CNAME) served as text, correct MIME types, no daemon (stays in the foreground so
 * Playwright's webServer can own it). Usage: node scripts/serve-dist.mjs [--port 4441] [--host 127.0.0.1]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const PORT = Number(flag('port', process.env.PORT ?? 4441));
const HOST = flag('host', '127.0.0.1');
const DIST = resolve(flag('dir', 'dist'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.map': 'application/json',
};

function send(res, file, status = 200) {
  const ext = extname(file);
  const type = MIME[ext] ?? (ext === '' ? 'text/plain; charset=utf-8' : 'application/octet-stream');
  const st = statSync(file);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': st.size,
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
      return;
    }
    file = join(file, 'index.html');
  }
  if (existsSync(file) && statSync(file).isFile()) {
    send(res, file);
    return;
  }
  // Pages serves /foo as /foo/index.html? No: it redirects /foo → /foo/ when the directory exists (handled above).
  const notFound = join(DIST, '404.html');
  if (existsSync(notFound)) send(res, notFound, 404);
  else res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${DIST} at http://${HOST}:${PORT}/ (Pages-like: 404.html on miss, no cache)`);
});
