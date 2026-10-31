import { personas } from '../lib/routes';
import type { Persona } from '../lib/content';
let persona: Persona = 'recruiter';
let initialized = false;
export const isPersona = (value: unknown): value is Persona => personas.some((item) => item === value);
export function getPersona(): Persona {
  if (!initialized) {
    initialized = true;
    try { const saved = sessionStorage.getItem('atlas:persona'); if (isPersona(saved)) persona = saved; } catch { /* Optional session preference. */ }
  }
  return persona;
}
export function announce(message: string): void {
  const region = document.querySelector('[data-atlas-status]');
  if (region) region.textContent = message;
}
export function emitState(detail: Record<string, unknown>): void { document.dispatchEvent(new CustomEvent('atlas:statechange', { detail: { version: 1, ...detail } })); }
export function setPersona(value: Persona): void {
  const changed = getPersona() !== value;
  persona = value;
  try { sessionStorage.setItem('atlas:persona', value); } catch { /* Keep the in-memory preference. */ }
  document.querySelectorAll<HTMLButtonElement>('button[data-persona]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.persona === value)));
  document.documentElement.dataset.persona = value;
  if (changed) document.dispatchEvent(new CustomEvent('atlas:personachange', { detail: { persona: value } }));
  emitState({ type: 'persona', persona: value });
}