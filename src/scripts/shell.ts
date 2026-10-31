import { initializeSearch } from './search';
import { announce, emitState, getPersona, isPersona, setPersona } from './state';
import { flip, initializeMotion } from './motion';
import { parseRequest } from './contracts';

export function initializeShell(): void {
  if (document.documentElement.dataset.shellReady === 'true') return;
  initializeMotion();
  initializeSearch();
  const root = document.documentElement;
  const os = matchMedia('(prefers-color-scheme: dark)');
  type Theme = 'system' | 'light' | 'dark';
  let theme: Theme = root.dataset.theme === 'dark' || root.dataset.theme === 'light' ? root.dataset.theme : 'system';
  const applyTheme = (choice: Theme, save: boolean) => {
    theme = choice;
    root.dataset.theme = choice;
    root.dataset.resolvedTheme = choice === 'system' ? (os.matches ? 'dark' : 'light') : choice;
    document.querySelectorAll('[data-theme-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-choice') === choice)));
    if (save) { try { localStorage.setItem('atlas:theme', choice); } catch { /* In-memory theme still works. */ } }
    emitState({ type: 'theme', preference: choice, resolved: root.dataset.resolvedTheme });
  };
  applyTheme(theme, false);
  document.querySelectorAll<HTMLElement>('.theme-control, .persona-control, [data-show-perspectives], [data-print]').forEach((element) => { element.hidden = false; });
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
    const choice = button.dataset.themeChoice;
    if (choice === 'system' || choice === 'light' || choice === 'dark') { applyTheme(choice, true); announce(`Appearance: ${choice}.`); }
  }));
  os.addEventListener('change', () => { if (theme === 'system') applyTheme('system', false); });
  addEventListener('storage', (event) => {
    if (event.key === 'atlas:theme' || event.key === null) applyTheme(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system', false);
  });
  let showAll = false;
  const perspectives = [...document.querySelectorAll<HTMLElement>('[data-perspective]')];
  const updatePerspectives = () => {
    if (perspectives.length) flip(perspectives, () => perspectives.forEach((section) => { section.hidden = !showAll && section.dataset.perspective !== getPersona(); }));
    document.querySelectorAll('[data-show-perspectives]').forEach((button) => {
      button.setAttribute('aria-pressed', String(showAll));
      button.textContent = showAll ? 'Use selected perspective' : 'Show all perspectives';
    });
  };
  document.querySelectorAll<HTMLButtonElement>('[data-persona]').forEach((button) => button.addEventListener('click', () => {
    if (isPersona(button.dataset.persona)) { setPersona(button.dataset.persona); announce(`${button.dataset.persona} reading lens. The facts and source evidence are unchanged.`); }
  }));
  document.querySelectorAll('[data-show-perspectives]').forEach((button) => button.addEventListener('click', () => { showAll = !showAll; updatePerspectives(); }));
  document.addEventListener('atlas:personachange', updatePerspectives);
  setPersona(getPersona());
  updatePerspectives();
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  document.addEventListener('atlas:request', (event) => {
    const request = parseRequest((event as CustomEvent<unknown>).detail, []);
    if (request?.type === 'set-persona') { setPersona(request.persona); announce(`Reading lens: ${request.persona}.`); }
  });
  // Native cross-document transitions require no client-side router/listener remounts.
  addEventListener('pageshow', () => {
    let restored = theme;
    try { const saved = localStorage.getItem('atlas:theme'); restored = saved === 'light' || saved === 'dark' ? saved : 'system'; } catch { /* Retain in-memory theme. */ }
    applyTheme(restored, false);
    try { const saved = sessionStorage.getItem('atlas:persona'); setPersona(isPersona(saved) ? saved : 'recruiter'); } catch { /* Retain in-memory lens. */ }
  });
  root.dataset.shellReady = 'true';
  document.dispatchEvent(new CustomEvent('atlas:ready', { detail: { version: 1, surface: 'shell' } }));
}