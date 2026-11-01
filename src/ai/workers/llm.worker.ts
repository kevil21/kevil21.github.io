/// <reference lib="webworker" />
/**
 * Full worker: WebLLM (pinned 0.2.87) on WebGPU. Loads a prebuilt Qwen2.5 model with progress, streams generations,
 * supports cancel, and reports GPU/OOM errors as fatal so the client unloads and falls back to Pocket (inherited).
 */
import type { FullRequest, FullResponse } from '../protocol';
import { FATAL_GPU_ERROR } from '../protocol';
import type { MLCEngine } from '@mlc-ai/web-llm';

const post = (m: FullResponse) => (self as unknown as Worker).postMessage(m);

let engine: MLCEngine | null = null;
let loaded: string | null = null;
let current: { id: number; cancelled: boolean } | null = null;

async function load(modelId: string): Promise<void> {
  try {
    const webllm = await import('@mlc-ai/web-llm');
    if (!engine) {
      engine = new webllm.MLCEngine({
        initProgressCallback: (r: { text: string; progress: number }) =>
          post({ type: 'load:progress', text: r.text, progress: r.progress }),
      });
    }
    await engine.reload(modelId);
    loaded = modelId;
    post({ type: 'load:ready', modelId });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    post({ type: 'load:error', message: msg, fatal: FATAL_GPU_ERROR.test(msg) });
  }
}

async function generate(
  id: number,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 320,
): Promise<void> {
  if (!engine || !loaded)
    return post({ type: 'generate:error', id, message: 'model not loaded', fatal: false });
  current = { id, cancelled: false };
  try {
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: maxTokens,
      stream_options: { include_usage: true },
    });
    let text = '';
    let usage: { prompt: number; completion: number } | undefined;
    for await (const chunk of stream) {
      if (current?.cancelled) break;
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        text += delta;
        post({ type: 'generate:delta', id, delta });
      }
      if (chunk.usage)
        usage = { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens };
    }
    post({ type: 'generate:done', id, text, ...(usage ? { usage } : {}) });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const fatal = FATAL_GPU_ERROR.test(msg);
    post({ type: 'generate:error', id, message: msg, fatal });
    if (fatal) await unload();
  } finally {
    current = null;
  }
}

async function unload(): Promise<void> {
  try {
    await engine?.unload();
  } catch {
    /* ignore */
  }
  loaded = null;
  post({ type: 'unloaded' });
}

self.onmessage = (e: MessageEvent<FullRequest>) => {
  const m = e.data;
  switch (m.type) {
    case 'load':
      void load(m.modelId);
      break;
    case 'generate':
      void generate(m.id, m.messages, m.maxTokens);
      break;
    case 'cancel':
      if (current && current.id === m.id) {
        current.cancelled = true;
        void engine?.interruptGenerate();
      }
      break;
    case 'unload':
      void unload();
      break;
  }
};
