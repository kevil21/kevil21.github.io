/**
 * Pinned model configuration shared by the Build Brain (Node) and the browser workers (ADR-013).
 * Inherited pins from TRACE/Atlas (verified on real WebGPU on 2026-11-01's predecessor builds).
 */
export const EMBEDDER = {
  id: 'Xenova/all-MiniLM-L6-v2',
  revision: '751bff37182d3f1213fa05d7196b954e230abad9',
  dtype: 'q8' as const,
  dims: 384,
  approxDownloadMB: 23,
  license: 'Apache-2.0',
} as const;

export interface FullModel {
  id: string;
  label: string;
  approxDownloadMB: number;
  vramMB: number;
  requiresF16: boolean;
  f32Fallback?: string;
  contextWindow: number;
  license: string;
  default?: boolean;
}

/** WebLLM 0.2.87 prebuilt ids. The 0.5B is the default download (Kevil's interview answer); 1.5B is "larger model". */
export const FULL_MODELS: FullModel[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B (compact)',
    approxDownloadMB: 290,
    vramMB: 945,
    requiresF16: true,
    f32Fallback: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    contextWindow: 4096,
    license: 'Apache-2.0',
    default: true,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B (larger)',
    approxDownloadMB: 880,
    vramMB: 1630,
    requiresF16: true,
    f32Fallback: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    contextWindow: 4096,
    license: 'Apache-2.0',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 0.5B (f32)',
    approxDownloadMB: 290,
    vramMB: 1060,
    requiresF16: false,
    contextWindow: 4096,
    license: 'Apache-2.0',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 1.5B (f32)',
    approxDownloadMB: 880,
    vramMB: 1890,
    requiresF16: false,
    contextWindow: 4096,
    license: 'Apache-2.0',
  },
];

export const TOOL_NAMES = [
  'walkTo',
  'setControl',
  'runMachine',
  'openCaseStudy',
  'highlightSkill',
  'showEvidence',
  'openResume',
  'startTour',
  'switchLens',
  'resetFloor',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const GENERATED_DIR = '/generated';
export const ORT_WASM_PATH = '/models/ort/';
export const MAX_TOOL_CALLS = 3;
