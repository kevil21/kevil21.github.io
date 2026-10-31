import { map } from 'nanostores';

export type PocketState = 'idle' | 'loading' | 'lexical' | 'lexical-inline' | 'semantic-loading' | 'semantic';
export type FullState =
  'unavailable' | 'available' | 'downloading' | 'loading' | 'ready' | 'generating' | 'error' | 'unloaded';

export interface AIState {
  pocket: PocketState;
  full: FullState;
  fullModel: string | null;
  fullProgress: number;
  fullProgressText: string;
  semanticProgress: number;
  semanticModel: string | null;
  indexChunks: number;
  lastError: string | null;
  /** the path the last answer took, for the observatory */
  lastPath: 'full' | 'pocket' | 'lexical' | 'static' | null;
  lastEvidence: string[];
}

export const aiState = map<AIState>({
  pocket: 'idle',
  full: 'unavailable',
  fullModel: null,
  fullProgress: 0,
  fullProgressText: '',
  semanticProgress: 0,
  semanticModel: null,
  indexChunks: 0,
  lastError: null,
  lastPath: null,
  lastEvidence: [],
});
