/**
 * Renders visualization specs (src/viz/spec.ts) as SVG or HTML. Colours come from tone classes in viz.css (theme
 * tokens only). Every chart is a <figure> with a role="img" label and a data-table twin in a <details>; nothing here
 * animates unless the visitor allows motion.
 */
import type { ComponentChildren } from 'preact';
import {
  describe,
  fmt,
  maxOf,
  niceMax,
  tableOf,
  type BarsViz,
  type ColumnsViz,
  type GaugeViz,
  type HeatViz,
  type LinesViz,
  type StagesViz,
  type VizSpec,
  type WaterfallViz,
} from './spec';

const W = 320;

/** SVG path through points, breaking the line at nulls. */
function linePath(pts: Array<number | null>, xAt: (i: number) => number, yAt: (v: number) => number): string {
  let d = '';
  let pen = false;
  pts.forEach((v, i) => {
    if (v === null || Number.isNaN(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

function Lines({ spec }: { spec: LinesViz }) {
  const H = 140;
  const x0 = 34;
  const x1 = W - 6;
  const y0 = 8;
  const y1 = H - 18;
  const n = Math.max(2, ...spec.series.map((s) => s.points.length), spec.band?.hi.length ?? 0);
  const xAt = (i: number) => x0 + (i / (n - 1)) * (x1 - x0);

  // cumulative series for stacked areas
  const cum: number[][] = [];
  if (spec.stacked) {
    let run = new Array<number>(n).fill(0);
    for (const s of spec.series) {
      run = run.map((v, i) => v + (s.points[i] ?? 0));
      cum.push(run);
    }
  }
  const flat: Array<Array<number | null>> = spec.stacked
    ? [cum[cum.length - 1] ?? []]
    : [...spec.series.map((s) => s.points), ...(spec.band ? [spec.band.lo, spec.band.hi] : [])];
  if (spec.hlines) flat.push(spec.hlines.map((h) => h.value));
  const hi = maxOf(flat, 0);
  let lo = Infinity;
  for (const a of flat) for (const v of a) if (v !== null && Number.isFinite(v) && v < lo) lo = v;
  if (!Number.isFinite(lo)) lo = 0;
  let yMin = 0;
  let yMax = niceMax(hi);
  if (!spec.stacked && lo > 0.35 * hi) {
    const pad = (hi - lo) * 0.12 || 1;
    yMin = Math.max(0, lo - pad);
    yMax = hi + pad;
  }
  const yAt = (v: number) => y1 - ((v - yMin) / (yMax - yMin || 1)) * (y1 - y0);

  return (
    <svg
      class="viz__svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={describe(spec)}
      preserveAspectRatio="xMidYMid meet"
    >
      <g aria-hidden="true">
        {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
          <g key={v}>
            <line class="viz__grid" x1={x0} x2={x1} y1={yAt(v)} y2={yAt(v)} />
            <text class="viz__txt viz__txt--end" x={x0 - 4} y={yAt(v) + 3}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {spec.band && (
          <path
            class={`viz__fill viz__t--${spec.band.tone}`}
            fill-opacity="0.22"
            d={`${linePath(spec.band.hi, xAt, yAt)}${[...spec.band.lo]
              .map((v, i) => [v, i] as const)
              .reverse()
              .filter(([v]) => v !== null)
              .map(([v, i]) => `L${xAt(i).toFixed(1)} ${yAt(v as number).toFixed(1)}`)
              .join('')}Z`}
          />
        )}
        {spec.stacked
          ? spec.series.map((s, k) => {
              const top = cum[k]!;
              const bottom = k === 0 ? new Array<number>(n).fill(0) : cum[k - 1]!;
              const d =
                top.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join('') +
                [...bottom]
                  .map((v, i) => `L${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
                  .reverse()
                  .join('') +
                'Z';
              return <path key={s.id} d={d} class={`viz__fill viz__t--${s.tone}`} fill-opacity="0.55" />;
            })
          : spec.series.map((s) => (
              <path
                key={s.id}
                d={linePath(s.points, xAt, yAt)}
                class={`viz__stroke viz__t--${s.tone}`}
                fill="none"
                stroke-width="1.8"
                stroke-linejoin="round"
                stroke-dasharray={s.dashed ? '4 3' : undefined}
              />
            ))}
        {spec.hlines?.map((h) => (
          <g key={h.label}>
            <line class="viz__ref" x1={x0} x2={x1} y1={yAt(h.value)} y2={yAt(h.value)} />
            <text class="viz__txt viz__txt--end" x={x1} y={yAt(h.value) - 3}>
              {h.label}
            </text>
          </g>
        ))}
        {spec.split !== undefined && spec.split > 0 && spec.split < n && (
          <g>
            <line class="viz__ref" x1={xAt(spec.split)} x2={xAt(spec.split)} y1={y0} y2={y1} />
            <text class="viz__txt" x={xAt(spec.split) + 3} y={y0 + 8}>
              now
            </text>
          </g>
        )}
        {spec.cursor !== undefined && (
          <line
            class="viz__cursor"
            x1={xAt(Math.min(n - 1, Math.max(0, spec.cursor)))}
            x2={xAt(Math.min(n - 1, Math.max(0, spec.cursor)))}
            y1={y0}
            y2={y1}
          />
        )}
        {spec.xLabels && (
          <>
            <text class="viz__txt" x={x0} y={H - 4}>
              {spec.xLabels[0]}
            </text>
            <text class="viz__txt viz__txt--end" x={x1} y={H - 4}>
              {spec.xLabels[1]}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}

function Columns({ spec }: { spec: ColumnsViz }) {
  const H = 130;
  const x0 = 30;
  const x1 = W - 4;
  const y0 = 10;
  const y1 = H - 20;
  const g = spec.categories.length;
  const yMax = niceMax(maxOf(spec.series.map((s) => s.values)));
  const gw = (x1 - x0) / Math.max(1, g);
  const bw = (gw * 0.78) / Math.max(1, spec.series.length);
  const yAt = (v: number) => y1 - (v / yMax) * (y1 - y0);
  const every = g > 14 ? Math.ceil(g / 10) : 1;
  const showVals = g * spec.series.length <= 12;
  return (
    <svg class="viz__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={describe(spec)}>
      <g aria-hidden="true">
        {[0, yMax / 2, yMax].map((v) => (
          <g key={v}>
            <line class="viz__grid" x1={x0} x2={x1} y1={yAt(v)} y2={yAt(v)} />
            <text class="viz__txt viz__txt--end" x={x0 - 4} y={yAt(v) + 3}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {spec.categories.map((c, i) => (
          <g key={`${c}-${i}`}>
            {spec.series.map((s, k) => {
              const v = s.values[i] ?? 0;
              const x = x0 + i * gw + gw * 0.11 + k * bw;
              return (
                <g key={s.id}>
                  <rect
                    class={`viz__fill viz__t--${s.tone}`}
                    x={x}
                    y={yAt(v)}
                    width={Math.max(1, bw - 0.6)}
                    height={Math.max(0, y1 - yAt(v))}
                  />
                  {showVals && v > 0 && (
                    <text class="viz__txt viz__txt--mid" x={x + bw / 2} y={yAt(v) - 2}>
                      {fmt(v)}
                    </text>
                  )}
                </g>
              );
            })}
            {i % every === 0 && (
              <text class="viz__txt viz__txt--mid" x={x0 + i * gw + gw / 2} y={H - 6}>
                {c}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

function Bars({ spec }: { spec: BarsViz }) {
  const max = spec.max ?? Math.max(1, ...spec.items.map((i) => i.value), spec.marker?.value ?? 0);
  return (
    <ul class="viz__bars" role="list">
      {spec.items.map((it) => (
        <li key={it.label} class="viz__bar">
          <span class="viz__bar-label">{it.label}</span>
          <span class="viz__track" aria-hidden="true">
            <span
              class={`viz__bar-fill viz__bg--${it.tone}`}
              style={{ width: `${Math.min(100, Math.max(0, (it.value / max) * 100))}%` }}
            />
            {spec.marker && (
              <span class="viz__marker" style={{ insetInlineStart: `${(spec.marker.value / max) * 100}%` }} />
            )}
          </span>
          <span class="viz__bar-value mono">
            {fmt(it.value)}
            {spec.unit ? ` ${spec.unit}` : ''}
            {it.note ? <span class="viz__bar-note"> · {it.note}</span> : null}
          </span>
        </li>
      ))}
      {spec.marker && (
        <li class="viz__bar-legend">
          <span class="viz__marker viz__marker--key" aria-hidden="true" /> {spec.marker.label}
        </li>
      )}
    </ul>
  );
}

function Heat({ spec }: { spec: HeatViz }) {
  const rows = spec.rows.length;
  const cols = spec.cols.length;
  const x0 = 30;
  const cw = (W - x0 - 4) / Math.max(1, cols);
  const ch = Math.min(9, 150 / Math.max(1, rows));
  const H = rows * ch + 16;
  const rEvery = rows > 12 ? 5 : 1;
  const cEvery = cols > 12 ? 2 : 1;
  return (
    <>
      <svg class="viz__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={describe(spec)}>
        <g aria-hidden="true">
          {spec.rows.map((r, i) => (
            <g key={`${r}-${i}`}>
              {i % rEvery === 0 && (
                <text class="viz__txt viz__txt--end" x={x0 - 4} y={i * ch + ch * 0.8}>
                  {r}
                </text>
              )}
              {spec.cols.map((_, j) => {
                const v = spec.cells[i]?.[j] ?? 0;
                return (
                  <rect
                    key={j}
                    class={`viz__fill viz__t--${spec.tone}`}
                    x={x0 + j * cw}
                    y={i * ch}
                    width={Math.max(1, cw - 1)}
                    height={Math.max(1, ch - 0.8)}
                    fill-opacity={(0.06 + 0.94 * Math.min(1, Math.max(0, v))).toFixed(2)}
                  />
                );
              })}
            </g>
          ))}
          {spec.cols.map((c, j) =>
            j % cEvery === 0 ? (
              <text key={c + j} class="viz__txt viz__txt--mid" x={x0 + j * cw + cw / 2} y={H - 4}>
                {c}
              </text>
            ) : null,
          )}
        </g>
      </svg>
      <p class="viz__legend viz__legend--ramp">
        <span>{spec.legend[0]}</span>
        <span class={`viz__ramp viz__bg--${spec.tone}`} aria-hidden="true" />
        <span>{spec.legend[1]}</span>
      </p>
    </>
  );
}

function Stages({ spec }: { spec: StagesViz }) {
  return (
    <ol class="viz__stages" role="list">
      {spec.items.map((s) => (
        <li key={s.label} class={`viz__stage viz__stage--${s.state}`}>
          <span class="viz__stage-label">{s.label}</span>
          <span class="viz__stage-state mono">{s.state}</span>
          <span class="viz__track" aria-hidden="true">
            <span
              class={`viz__bar-fill ${s.state === 'waiting' ? 'viz__bg--ember' : 'viz__bg--teal'}`}
              style={{ width: `${Math.round(s.progress * 100)}%` }}
            />
          </span>
          {s.note && <span class="viz__stage-note">{s.note}</span>}
        </li>
      ))}
    </ol>
  );
}

function Waterfall({ spec }: { spec: WaterfallViz }) {
  const H = 140;
  const x0 = 22;
  const x1 = W - 6;
  const y0 = 12;
  const y1 = H - 22;
  const yAt = (v: number) => y1 - (v / spec.max) * (y1 - y0);
  const n = spec.steps.length;
  const sw = (x1 - x0) / Math.max(1, n);
  let run = 0;
  return (
    <svg class="viz__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={describe(spec)}>
      <g aria-hidden="true">
        <line class="viz__grid" x1={x0} x2={x1} y1={yAt(0)} y2={yAt(0)} />
        {spec.thresholds.map((t) => (
          <g key={t.label}>
            <line class="viz__ref" x1={x0} x2={x1} y1={yAt(t.value)} y2={yAt(t.value)} />
            <text class="viz__txt viz__txt--end" x={x1} y={yAt(t.value) - 3}>
              {t.label}
            </text>
          </g>
        ))}
        {spec.steps.map((s, i) => {
          const from = s.kind === 'total' ? 0 : run;
          const to = s.kind === 'total' ? run : Math.min(spec.max, run + s.delta);
          if (s.kind !== 'total') run = to;
          const top = Math.max(from, to);
          const bottom = Math.min(from, to);
          const x = x0 + i * sw + sw * 0.14;
          return (
            <g key={s.label}>
              <rect
                class={`viz__fill viz__t--${s.tone}`}
                x={x}
                y={yAt(top)}
                width={sw * 0.72}
                height={Math.max(1.5, yAt(bottom) - yAt(top))}
              />
              <text class="viz__txt viz__txt--mid" x={x + sw * 0.36} y={yAt(top) - 3}>
                {s.kind === 'total' ? fmt(run) : `${s.delta >= 0 ? '+' : ''}${fmt(s.delta)}`}
              </text>
              <text class="viz__txt viz__txt--mid" x={x + sw * 0.36} y={H - 6}>
                {s.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Gauge({ spec }: { spec: GaugeViz }) {
  const cx = 100;
  const cy = 92;
  const r = 70;
  const ang = (v: number) => Math.PI * (1 + Math.min(1, Math.max(0, v / spec.max)));
  const pt = (v: number, rr: number) => [cx + Math.cos(ang(v)) * rr, cy + Math.sin(ang(v)) * rr] as const;
  const [ex, ey] = pt(spec.value, r);
  const [nx, ny] = pt(spec.value, r - 10);
  const track = `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const sweep = `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  const th = spec.threshold
    ? { a: pt(spec.threshold.value, r + 6), b: pt(spec.threshold.value, r - 8) }
    : null;
  return (
    <div class="viz__gauge">
      <svg class="viz__svg viz__svg--gauge" viewBox="0 0 200 108" role="img" aria-label={describe(spec)}>
        <g aria-hidden="true">
          <path d={track} class="viz__gauge-track" fill="none" stroke-width="9" stroke-linecap="round" />
          <path
            d={sweep}
            class={`viz__stroke viz__t--${spec.tone}`}
            fill="none"
            stroke-width="9"
            stroke-linecap="round"
          />
          {th && <line class="viz__cursor" x1={th.a[0]} y1={th.a[1]} x2={th.b[0]} y2={th.b[1]} />}
          <line
            class="viz__needle"
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke-width="2.4"
            stroke-linecap="round"
          />
          <circle class="viz__needle-hub" cx={cx} cy={cy} r="4" />
          <text class="viz__txt viz__txt--mid viz__txt--big" x={cx} y={cy + 16}>
            {fmt(spec.value)}
            {spec.unit ? ` ${spec.unit}` : ''}
          </text>
        </g>
      </svg>
      <p class="viz__gauge-text">
        {spec.text}
        {spec.threshold ? ` · tick: ${spec.threshold.label}` : ''}
      </p>
    </div>
  );
}

function Chart({ spec }: { spec: VizSpec }): ComponentChildren {
  switch (spec.kind) {
    case 'lines':
      return <Lines spec={spec} />;
    case 'columns':
      return <Columns spec={spec} />;
    case 'bars':
      return <Bars spec={spec} />;
    case 'heat':
      return <Heat spec={spec} />;
    case 'stages':
      return <Stages spec={spec} />;
    case 'waterfall':
      return <Waterfall spec={spec} />;
    case 'gauge':
      return <Gauge spec={spec} />;
  }
}

function Legend({ spec }: { spec: VizSpec }) {
  const entries =
    spec.kind === 'lines'
      ? [
          ...spec.series.map((s) => ({ key: s.id, label: s.label, tone: s.tone, dashed: s.dashed })),
          ...(spec.band
            ? [{ key: 'band', label: spec.band.label, tone: spec.band.tone, dashed: false }]
            : []),
        ]
      : spec.kind === 'columns'
        ? spec.series.map((s) => ({ key: s.id, label: s.label, tone: s.tone, dashed: false }))
        : [];
  if (entries.length < 2) return null;
  return (
    <ul class="viz__legend" role="list">
      {entries.map((e) => (
        <li key={e.key}>
          <span
            class={`viz__swatch viz__bg--${e.tone} ${e.dashed ? 'viz__swatch--dashed' : ''}`}
            aria-hidden="true"
          />{' '}
          {e.label}
        </li>
      ))}
    </ul>
  );
}

/** One instrument: figure, chart, legend, text twin. */
export function Viz({ spec }: { spec: VizSpec }) {
  const twin = tableOf(spec);
  return (
    <figure class={`viz viz--${spec.kind}`} data-viz={spec.id}>
      <figcaption class="viz__cap">
        <strong class="viz__title">{spec.title}</strong>
        {spec.caption && <span class="viz__sub">{spec.caption}</span>}
      </figcaption>
      <Chart spec={spec} />
      <Legend spec={spec} />
      <details class="viz__twin">
        <summary>Data table</summary>
        <div class="viz__table-wrap" role="region" aria-label={`${spec.title}: data table`} tabIndex={0}>
          <table class="viz__table">
            <thead>
              <tr>
                {twin.head.map((h, i) => (
                  <th key={`${h}-${i}`} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {twin.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">
                        {c}
                      </th>
                    ) : (
                      <td key={j}>{c}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** The "Live instruments" block of a control panel. */
export function Instruments({ specs }: { specs: VizSpec[] }) {
  if (!specs.length) return null;
  return (
    <section class="instruments" aria-label="Live instruments">
      <span class="eyebrow">Live instruments · sample data</span>
      <div class="instruments__grid">
        {specs.map((s) => (
          <Viz key={s.id} spec={s} />
        ))}
      </div>
    </section>
  );
}
