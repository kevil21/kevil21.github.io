/**
 * Full Brain model catalogue (ADR-010). Sizes were measured from the Hugging Face file listings on
 * 2026-10-31; VRAM figures are WebLLM's own `vram_required_MB` estimates from its prebuilt config.
 * q4f16 variants need the WebGPU `shader-f16` feature; q4f32 variants are the automatic fallback.
 */
export interface FullModel {
  id: string;
  label: string;
  approxDownloadMB: number;
  vramMB: number;
  requiresF16: boolean;
  license: string;
  recommendedFor: 'desktop' | 'compact';
  /** the model to use instead when shader-f16 is unavailable */
  f32Fallback?: string;
  contextWindow: number;
}

export const FULL_MODELS: FullModel[] = [
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B Instruct (recommended)',
    approxDownloadMB: 880,
    vramMB: 1630,
    requiresF16: true,
    license: 'Apache-2.0',
    recommendedFor: 'desktop',
    f32Fallback: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    contextWindow: 4096,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B Instruct (compact)',
    approxDownloadMB: 290,
    vramMB: 945,
    requiresF16: true,
    license: 'Apache-2.0',
    recommendedFor: 'compact',
    f32Fallback: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    contextWindow: 4096,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 1.5B Instruct (f32, no shader-f16 needed)',
    approxDownloadMB: 880,
    vramMB: 1890,
    requiresF16: false,
    license: 'Apache-2.0',
    recommendedFor: 'desktop',
    contextWindow: 4096,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 0.5B Instruct (f32, no shader-f16 needed)',
    approxDownloadMB: 290,
    vramMB: 1060,
    requiresF16: false,
    license: 'Apache-2.0',
    recommendedFor: 'compact',
    contextWindow: 4096,
  },
];

export const DEFAULT_FULL_MODEL = FULL_MODELS[0]!.id;
export const COMPACT_FULL_MODEL = FULL_MODELS[1]!.id;

export function modelById(id: string): FullModel | undefined {
  return FULL_MODELS.find((m) => m.id === id);
}
