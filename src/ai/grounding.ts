import { z } from 'zod';
import type { Corpus } from './corpus';
import { toolSchema } from './tools';

export function selectionSchema(corpus: Corpus, retrieved: string[]) {
  const allowed = retrieved.filter((id) => corpus.evidence.some((e) => e.id === id));
  return z.strictObject({
    evidenceIds: z.array(z.string().max(80).refine((id) => allowed.includes(id))).max(6).refine((ids) => new Set(ids).size === ids.length),
    tools: z.array(toolSchema(corpus)).max(2).optional(),
  });
}
export function parseSelection(text: string, corpus: Corpus, retrieved: string[]) {
  if (text.length > 8000) throw new Error('Oversize selection');
  const selected = selectionSchema(corpus, retrieved).parse(JSON.parse(text));
  if (!selected.evidenceIds.length && selected.tools?.length) throw new Error('Actions without evidence');
  return selected;
}