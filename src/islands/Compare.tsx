import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { compareIds } from '@/lib/stores/ui';

export interface CompareProject {
  id: string;
  name: string;
  kind: string;
  period: string;
  tagline: string;
  stack: string[];
  skills: string[];
  outcomes: string[];
  decisions: number;
  evidence: { title: string; url: string }[];
  url: string;
}

export default function Compare({ projects }: { projects: CompareProject[] }) {
  const ids = useStore(compareIds);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean) ?? [];
    if (fromUrl.length && !compareIds.get().length) compareIds.set(fromUrl.slice(0, 3));
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(location.href);
    if (ids.length) url.searchParams.set('ids', ids.join(','));
    else url.searchParams.delete('ids');
    history.replaceState(history.state, '', url);
  }, [ids, hydrated]);

  const toggle = (id: string) => {
    const cur = compareIds.get();
    compareIds.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-3));
  };
  const chosen = ids
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is CompareProject => Boolean(p));
  const rows: { label: string; render: (p: CompareProject) => preact.ComponentChildren }[] = [
    { label: 'Kind · period', render: (p) => `${p.kind} · ${p.period}` },
    { label: 'Tagline', render: (p) => p.tagline },
    {
      label: 'Stack',
      render: (p) => (
        <ul class="cluster" role="list" style="--cluster-gap:4px">
          {p.stack.map((s) => (
            <li class="attr">{s}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Skills',
      render: (p) => (
        <ul class="cluster" role="list" style="--cluster-gap:4px">
          {p.skills.map((s) => (
            <li class="attr">{s}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Outcomes',
      render: (p) =>
        p.outcomes.length ? (
          <ul class="span-detail__list" role="list">
            {p.outcomes.map((o) => (
              <li>{o}</li>
            ))}
          </ul>
        ) : (
          <span class="faint">none recorded</span>
        ),
    },
    { label: 'Decisions', render: (p) => `${p.decisions}` },
    {
      label: 'Evidence',
      render: (p) =>
        p.evidence.length ? (
          <ul class="span-detail__list" role="list">
            {p.evidence.map((e) => (
              <li>
                <a href={e.url} target="_blank" rel="noopener noreferrer external">
                  {e.title} ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span class="faint">no external evidence</span>
        ),
    },
  ];

  return (
    <div class="compare">
      <div class="filters__row" role="group" aria-label="Projects to compare">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            class="chip"
            aria-pressed={ids.includes(p.id)}
            onClick={() => toggle(p.id)}
            disabled={!ids.includes(p.id) && ids.length >= 3}
          >
            {p.name}
          </button>
        ))}
      </div>
      {chosen.length < 2 ? (
        <p class="note" style="margin-block-start:var(--sp-4)">
          Select at least two projects to compare.
        </p>
      ) : (
        <div
          class="compare__table"
          role="table"
          aria-label="Project comparison"
          style={`--n:${chosen.length}`}
        >
          <div role="row" class="compare__row compare__row--head">
            <div role="columnheader" class="compare__label"></div>
            {chosen.map((p) => (
              <div role="columnheader" key={p.id} class="compare__cell">
                <a href={p.url}>
                  <strong>{p.name}</strong>
                </a>
              </div>
            ))}
          </div>
          {rows.map((r) => (
            <div role="row" class="compare__row" key={r.label}>
              <div role="rowheader" class="compare__label mono small">
                {r.label}
              </div>
              {chosen.map((p) => (
                <div role="cell" key={p.id} class="compare__cell small">
                  {r.render(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <style>{`
        .compare__table{margin-block-start:var(--sp-5);display:grid;gap:2px;overflow-x:auto}
        .compare__row{display:grid;grid-template-columns:8rem repeat(var(--n),minmax(12rem,1fr));gap:var(--sp-2);padding:var(--sp-3);border-radius:var(--r-2);background:var(--surface-1);border:var(--hairline) solid var(--border)}
        .compare__row--head{background:transparent;border:0}
        .compare__label{color:var(--text-3)}
        .compare__cell{min-inline-size:0}
      `}</style>
    </div>
  );
}
