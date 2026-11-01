#!/usr/bin/env node
/**
 * LAN preview with a QR code so Kevil can open the build on his phone (prompt §6).
 * Serves dist/ with scripts/serve-dist.mjs on 0.0.0.0 and prints a QR for each LAN address.
 * Note: a LAN http:// origin is not a secure context, so WebGPU and the service worker are unavailable there;
 * the 3D falls back to WebGL2 and the Full tier stays disabled. Use 127.0.0.1 on this machine for those.
 */
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import qrcode from 'qrcode-terminal';

const PORT = Number(process.env.PORT ?? 4442);
const addrs = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

const child = spawn(
  process.execPath,
  [new URL('./serve-dist.mjs', import.meta.url).pathname, '--port', String(PORT), '--host', '0.0.0.0'],
  {
    stdio: 'inherit',
  },
);

setTimeout(() => {
  if (!addrs.length) {
    console.log('\nNo LAN IPv4 address found. Preview is on http://127.0.0.1:' + PORT + '/');
    return;
  }
  for (const a of addrs) {
    const url = `http://${a}:${PORT}/`;
    console.log(`\nOpen on your phone (same Wi-Fi): ${url}`);
    qrcode.generate(url, { small: true });
  }
  console.log(
    '\nLAN http:// is not a secure context: WebGL2 path, no WebGPU, no service worker. Ctrl+C to stop.',
  );
}, 1500);

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});
