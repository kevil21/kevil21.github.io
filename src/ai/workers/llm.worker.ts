/// <reference lib="webworker" />
/**
 * Full Brain worker (Tier 2). Hosts the WebLLM engine so generation never blocks the UI thread.
 * Model weights are fetched by WebLLM and cached in the Cache API ("webllm/model" etc.).
 */
import type { FullRequest, FullResponse } from '../protocol';
import type { MLCEngine } from '@mlc-ai/web-llm';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (m: FullResponse) => ctx.postMessage(m);

let engine: MLCEngine | null = null;
let loadedModel: string | null = null;
let current: { id: number; abort: boolean } | null = null;

ctx.onmessage = async (ev: MessageEvent<FullRequest>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case 'load': {
        if (engine && loadedModel === msg.modelId) {
          post({ type: 'loaded', modelId: msg.modelId });
          return;
        }
        const webllm = await import('@mlc-ai/web-llm');
        if (!engine) {
          engine = new webllm.MLCEngine({
            initProgressCallback: (p) => post({ type: 'progress', text: p.text, progress: p.progress }),
          });
        }
        await engine.reload(msg.modelId);
        loadedModel = msg.modelId;
        post({ type: 'loaded', modelId: msg.modelId });
        break;
      }
      case 'generate': {
        if (!engine || !loadedModel) throw new Error('model not loaded');
        current = { id: msg.id, abort: false };
        const stream = await engine.chat.completions.create({
          messages: [{ role: 'system', content: msg.system }, ...msg.messages],
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: msg.maxTokens ?? 320,
        });
        let text = '';
        let usage: { prompt: number; completion: number } | undefined;
        for await (const chunk of stream) {
          if (current?.abort) {
            await engine.interruptGenerate();
            break;
          }
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            text += delta;
            post({ type: 'token', id: msg.id, delta });
          }
          if (chunk.usage)
            usage = { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens };
        }
        post({ type: 'done', id: msg.id, text, usage });
        current = null;
        break;
      }
      case 'cancel': {
        if (current && (msg.id === undefined || current.id === msg.id)) current.abort = true;
        break;
      }
      case 'unload': {
        await engine?.unload();
        engine = null;
        loadedModel = null;
        post({ type: 'unloaded' });
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const fatal = /webgpu|adapter|device|out of memory|OOM|shader/i.test(message);
    post({ type: 'error', id: 'id' in msg ? msg.id : undefined, message, fatal });
    if (fatal) {
      try {
        await engine?.unload();
      } catch {
        /* ignore */
      }
      engine = null;
      loadedModel = null;
    }
  }
};
