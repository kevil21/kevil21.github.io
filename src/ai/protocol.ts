/**
 * Shared types between the UI, the Build Brain output and the workers.
 * Kept free of DOM and Node dependencies so both tsconfigs can include it.
 */
export interface IndexNode {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  url: string;
  external?: boolean;
  tone: string;
  text: string;
  /** related attribute ids (skills/technologies) for ranking boosts */
  attrs: string[];
}

export interface IndexEdge {
  from: string;
  to: string;
  type: string;
}

export interface KnowledgeIndex {
  version: string;
  generatedAt: string;
  nodes: IndexNode[];
  edges: IndexEdge[];
  /** evidence chunks: the retrievable units for grounding */
  chunks: Chunk[];
}

export interface Chunk {
  id: string;
  nodeId: string;
  kind: 'summary' | 'highlight' | 'outcome' | 'approach' | 'decision' | 'fact' | 'credential';
  text: string;
  source: string;
  url: string;
  selfReported?: boolean;
}

export interface SemanticIndex {
  version: string;
  model: string;
  dims: number;
  /** chunk ids in row order */
  ids: string[];
  /** base64 of Float32Array (ids.length * dims), L2-normalised */
  vectors: string;
}

export interface AnswerEntry {
  id: string;
  question: string;
  /** alternative phrasings used for lexical matching */
  patterns: string[];
  answer: string;
  evidence: string[]; // chunk ids
  tools?: ToolCall[];
}

export interface AnswerIndex {
  version: string;
  answers: AnswerEntry[];
}

export interface AIManifest {
  version: string;
  indexHash: string;
  generatedAt: string;
  pocket: { embedder: string; revision: string; dtype: string; dims: number; approxDownloadMB: number };
  full: {
    models: {
      id: string;
      label: string;
      approxDownloadMB: number;
      vramMB: number;
      requiresF16: boolean;
      license: string;
      recommendedFor: 'desktop' | 'compact';
    }[];
  };
  tools: string[];
}

export type ToolName =
  | 'navigateTo'
  | 'filterProjects'
  | 'openProject'
  | 'highlightSkill'
  | 'openResume'
  | 'switchPersona'
  | 'showRelevantExperience'
  | 'showEvidence'
  | 'compareProjects'
  | 'resetWorkspace';

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
}

export interface RetrievedChunk extends Chunk {
  score: number;
  via: 'lexical' | 'semantic' | 'answer';
}

/* ---------- Pocket worker protocol ---------- */
export type PocketRequest =
  | { type: 'init'; indexUrl: string; semanticUrl: string | null; wasmBase: string; allowDownload: boolean }
  | { type: 'search'; id: number; query: string; limit?: number }
  | { type: 'match-jd'; id: number; text: string }
  | { type: 'embed-enable'; id: number }
  | { type: 'cancel'; id: number };

export type PocketResponse =
  | { type: 'ready'; lexical: true; semantic: boolean; chunks: number }
  | { type: 'semantic-progress'; loadedMB: number; totalMB: number }
  | { type: 'semantic-ready'; model: string }
  | { type: 'semantic-failed'; reason: string }
  | {
      type: 'results';
      id: number;
      chunks: RetrievedChunk[];
      answer: AnswerEntry | null;
      mode: 'lexical' | 'semantic';
    }
  | { type: 'jd-result'; id: number; result: JDMatchResult }
  | { type: 'error'; id?: number; message: string };

export interface JDRequirement {
  id: string;
  text: string;
  terms: string[];
}
export type JDBucket = 'strong' | 'related' | 'none';
export interface JDMatchRow {
  requirement: JDRequirement;
  bucket: JDBucket;
  evidence: RetrievedChunk[];
  matchedTerms: string[];
}
export interface JDMatchResult {
  rows: JDMatchRow[];
  counts: Record<JDBucket, number>;
  mode: 'lexical' | 'semantic';
}

/* ---------- Full brain worker protocol ---------- */
export type FullRequest =
  | { type: 'load'; modelId: string }
  | {
      type: 'generate';
      id: number;
      system: string;
      messages: { role: 'user' | 'assistant'; content: string }[];
      maxTokens?: number;
    }
  | { type: 'cancel'; id?: number }
  | { type: 'unload' };

export type FullResponse =
  | { type: 'progress'; text: string; progress: number }
  | { type: 'loaded'; modelId: string }
  | { type: 'token'; id: number; delta: string }
  | { type: 'done'; id: number; text: string; usage?: { prompt: number; completion: number } }
  | { type: 'error'; id?: number; message: string; fatal?: boolean }
  | { type: 'unloaded' };
