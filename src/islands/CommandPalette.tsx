import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { paletteOpen } from '@/lib/stores/ui';
import { setPersona } from '@/lib/stores/persona';
import { setThemePreference } from '@/lib/stores/theme';
import { routes } from '@/lib/knowledge/routes';
import type { RetrievedChunk, AnswerEntry } from '@/ai/protocol';
import type { PocketClient } from '@/ai/runtime/pocket-client';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: 'navigate' | 'persona' | 'theme' | 'ai';
  run: () => void;
}

const commands: Command[] = [
  { id: 'nav-trace', label: 'Go to Trace', group: 'navigate', run: () => go(routes.home()) },
  { id: 'nav-work', label: 'Go to Work', group: 'navigate', run: () => go('/work/') },
  { id: 'nav-skills', label: 'Go to Skills', group: 'navigate', run: () => go(routes.skills()) },
  {
    id: 'nav-credentials',
    label: 'Go to Credentials',
    group: 'navigate',
    run: () => go(routes.credentials()),
  },
  { id: 'nav-resume', label: 'Open résumé', group: 'navigate', run: () => go(routes.resume()) },
  { id: 'nav-match', label: 'Match a job description', group: 'navigate', run: () => go(routes.match()) },
  { id: 'nav-ask', label: 'Ask about my work (AI)', group: 'ai', run: () => go(routes.ask()) },
  {
    id: 'nav-observatory',
    label: 'Behind the architecture',
    group: 'navigate',
    run: () => go(routes.observatory()),
  },
  {
    id: 'persona-recruiter',
    label: 'View as recruiter',
    group: 'persona',
    run: () => setPersona('recruiter'),
  },
  { id: 'persona-engineer', label: 'View as engineer', group: 'persona', run: () => setPersona('engineer') },
  {
    id: 'persona-architect',
    label: 'View as architect',
    group: 'persona',
    run: () => setPersona('architect'),
  },
  { id: 'theme-system', label: 'Theme: system', group: 'theme', run: () => setThemePreference('system') },
  { id: 'theme-light', label: 'Theme: light', group: 'theme', run: () => setThemePreference('light') },
  { id: 'theme-dark', label: 'Theme: dark', group: 'theme', run: () => setThemePreference('dark') },
];

function go(href: string) {
  const nav = (window as Window & { navigation?: unknown }).navigation;
  void nav;
  location.assign(href);
}

export default function CommandPalette() {
  const open = useStore(paletteOpen);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [answer, setAnswer] = useState<AnswerEntry | null>(null);
  const [mode, setMode] = useState<'idle' | 'lexical' | 'semantic' | 'loading'>('idle');
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const brain = useRef<PocketClient | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      requestAnimationFrame(() => input.current?.focus());
      if (!brain.current) {
        setMode('loading');
        import('@/ai/runtime/pocket-client').then(async ({ getPocketClient }) => {
          brain.current = getPocketClient();
          await brain.current.ready;
          setMode(brain.current.semantic ? 'semantic' : 'lexical');
        });
      }
    } else if (!open && d.open) {
      d.close();
      setQ('');
      setResults([]);
      setAnswer(null);
    }
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && paletteOpen.get()) paletteOpen.set(false);
    };
    addEventListener('keydown', onKey);
    dialog.current?.setAttribute('data-ready', '1');
    return () => removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!q.trim() || !brain.current) {
      setResults([]);
      setAnswer(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await brain.current!.search(q, 6);
      if (cancelled) return;
      setResults(r.chunks);
      setAnswer(r.answer);
      setMode(r.mode);
      setActive(0);
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const filteredCommands = q.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
    : commands.slice(0, 8);
  const items: {
    key: string;
    label: string;
    hint?: string;
    run: () => void;
    kind: 'answer' | 'result' | 'command';
  }[] = [
    ...(answer
      ? [
          {
            key: 'answer',
            label: answer.answer,
            hint: answer.question,
            kind: 'answer' as const,
            run: () => go(`${routes.ask()}?q=${encodeURIComponent(q)}`),
          },
        ]
      : []),
    ...results.map((r) => ({
      key: r.id,
      label: r.text,
      hint: `${r.kind} · ${r.via}`,
      kind: 'result' as const,
      run: () => go(r.url),
    })),
    ...filteredCommands.map((c) => ({
      key: c.id,
      label: c.label,
      hint: c.group,
      kind: 'command' as const,
      run: c.run,
    })),
  ];

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[active];
      if (it) {
        paletteOpen.set(false);
        it.run();
      } else if (q.trim()) {
        paletteOpen.set(false);
        go(`${routes.ask()}?q=${encodeURIComponent(q)}`);
      }
    }
  };

  return (
    <dialog
      ref={dialog}
      class="palette"
      aria-label="Search or ask"
      onClose={() => paletteOpen.set(false)}
      onClick={(e) => e.target === dialog.current && paletteOpen.set(false)}
    >
      <div class="palette__box">
        <div class="palette__input">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input
            ref={input}
            type="search"
            value={q}
            placeholder="Search skills, projects, credentials — or ask a question"
            aria-label="Search or ask"
            aria-controls="palette-list"
            aria-activedescendant={items[active]?.key}
            autocomplete="off"
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            onKeyDown={onKeyDown}
          />
          <span class={`palette__mode mono ai-state ai-state--${mode}`} aria-live="polite">
            {mode === 'loading'
              ? 'loading index…'
              : mode === 'semantic'
                ? 'semantic'
                : mode === 'lexical'
                  ? 'lexical'
                  : ''}
          </span>
        </div>
        <ul id="palette-list" class="palette__list" role="listbox" aria-label="Results">
          {items.map((it, i) => (
            <li
              key={it.key}
              id={it.key}
              role="option"
              aria-selected={i === active}
              class={`palette__item palette__item--${it.kind} ${i === active ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => {
                paletteOpen.set(false);
                it.run();
              }}
            >
              <span class="palette__label">{it.label}</span>
              {it.hint && <span class="palette__hint mono">{it.hint}</span>}
            </li>
          ))}
          {q.trim() && items.length === 0 && mode !== 'loading' && (
            <li class="palette__item palette__item--empty" role="option" aria-selected="false">
              <span class="palette__label">
                Not demonstrated in this portfolio. Press Enter to ask anyway.
              </span>
            </li>
          )}
        </ul>
        <footer class="palette__footer mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span class="palette__privacy">Runs on your device · nothing is sent anywhere</span>
        </footer>
      </div>
    </dialog>
  );
}
