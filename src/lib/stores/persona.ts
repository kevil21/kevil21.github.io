import { atom } from 'nanostores';
import type { PersonaId } from '../schema';

export const PERSONA_KEY = 'trace:persona';
export const personas: { id: PersonaId; label: string; hint: string }[] = [
  { id: 'recruiter', label: 'Recruiter', hint: 'Roles, outcomes, credentials' },
  { id: 'engineer', label: 'Engineer', hint: 'Projects, stack, implementation' },
  { id: 'architect', label: 'Architect', hint: 'Decisions, systems, trade-offs' },
];

function read(): PersonaId {
  if (typeof localStorage === 'undefined') return 'engineer';
  try {
    const v = localStorage.getItem(PERSONA_KEY);
    return v === 'recruiter' || v === 'architect' || v === 'engineer' ? v : 'engineer';
  } catch {
    return 'engineer';
  }
}

export const persona = atom<PersonaId>(read());

export function setPersona(p: PersonaId, opts: { announce?: boolean } = { announce: true }) {
  if (persona.get() === p) return;
  persona.set(p);
  try {
    localStorage.setItem(PERSONA_KEY, p);
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.persona = p;
  if (opts.announce)
    document.dispatchEvent(new CustomEvent('tracepersonachange', { detail: { persona: p } }));
}

let bound = false;
export function bindPersona() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  document.documentElement.dataset.persona = persona.get();
  persona.subscribe((p) => {
    document.documentElement.dataset.persona = p;
  });
}
