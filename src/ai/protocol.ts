import { z } from 'zod';
import { personaSchema } from '../lib/schema';
import { MAX_JD, MAX_QUERY } from './corpus';
export const pocketRequest = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('init'), id: z.number().int(), contentHash: z.string().length(64), corpusHash: z.string().length(64) }),
  z.strictObject({ type: z.literal('query'), id: z.number().int(), query: z.string().max(MAX_QUERY), persona: personaSchema, context: z.string().max(80) }),
  z.strictObject({ type: z.literal('jd'), id: z.number().int(), text: z.string().max(MAX_JD), persona: personaSchema }),
  z.strictObject({ type: z.literal('semantic'), id: z.number().int() }),
]);
export type PocketRequest = z.infer<typeof pocketRequest>;
export async function boundedJSON(url: string, maxBytes = 800000): Promise<unknown> {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) });
  if (!response.ok || Number(response.headers.get('content-length')) > maxBytes) throw new Error('Corpus unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body');
  let size = 0; const chunks: Uint8Array[] = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) throw new Error('Oversize corpus'); chunks.push(value); } } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}