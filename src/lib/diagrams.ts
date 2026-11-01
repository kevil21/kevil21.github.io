/**
 * Architecture diagrams as data: nodes on a grid, edges between them. Rendered by FlowDiagram.astro as inline SVG
 * with token colours (works without JavaScript, in print and in reduced motion). Every node name comes from the fact
 * ledger; nothing is drawn that the sources do not describe.
 */
export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  col: number; // 0-based column
  row: number; // 0-based row
  tone?: 'default' | 'amber' | 'teal' | 'sage' | 'ember' | 'brass';
}
export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}
export interface Diagram {
  title: string;
  source: string; // ledger ids
  cols: number;
  rows: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const DIAGRAMS: Record<string, Diagram> = {
  'telemetry-refinery': {
    title: 'A360 streaming pipeline',
    source: 'F-C01, F-C04–F-C09, F-C12–F-C14',
    cols: 6,
    rows: 3,
    nodes: [
      { id: 'agents', label: 'Customer agents', sub: 'OTLP traces', col: 0, row: 1, tone: 'teal' },
      { id: 'pg', label: 'Postgres', sub: 'staging', col: 1, row: 1 },
      {
        id: 'adx',
        label: 'Azure Data Explorer',
        sub: '3 facts · 4 dims · 31 MVs',
        col: 2,
        row: 1,
        tone: 'amber',
      },
      { id: 'sync', label: 'ADX → ES sync', sub: 'every 10 min', col: 3, row: 1, tone: 'brass' },
      { id: 'es', label: 'Elasticsearch', sub: 'per-tenant indices', col: 4, row: 1 },
      { id: 'gw', label: 'FastAPI gateway', sub: 'JWKS · 7 routers', col: 4, row: 0, tone: 'sage' },
      {
        id: 'ui',
        label: 'Next.js 16 UI',
        sub: '11 KPI tiles · 10 Kibana pages',
        col: 5,
        row: 0,
        tone: 'teal',
      },
      { id: 'board', label: 'Boarding function', sub: 'provisions a tenant', col: 2, row: 2 },
      { id: 'synth', label: 'Synthetic telemetry', sub: '6-hour timer', col: 0, row: 2, tone: 'brass' },
      { id: 'cosmos', label: 'Cosmos DB', sub: 'tenant metadata', col: 3, row: 2 },
    ],
    edges: [
      { from: 'agents', to: 'pg' },
      { from: 'pg', to: 'adx' },
      { from: 'adx', to: 'sync' },
      { from: 'sync', to: 'es', label: '31 MVs × N' },
      { from: 'es', to: 'gw' },
      { from: 'gw', to: 'ui' },
      { from: 'synth', to: 'pg', dashed: true },
      { from: 'board', to: 'adx', dashed: true },
      { from: 'board', to: 'es', dashed: true },
      { from: 'cosmos', to: 'gw', dashed: true },
      { from: 'ui', to: 'agents', label: 'dogfooding', dashed: true },
    ],
  },
  'policy-sorter': {
    title: 'Policy → Pipelines: five agents on one LangGraph',
    source: 'F-C31–F-C37, F-C40',
    cols: 5,
    rows: 3,
    nodes: [
      { id: 'nl', label: 'Plain-English policy', col: 0, row: 0, tone: 'teal' },
      {
        id: 'compile',
        label: 'Policy Compiler',
        sub: 'NL → PolicyConstraint',
        col: 0,
        row: 1,
        tone: 'amber',
      },
      {
        id: 'drift',
        label: 'Drift Scanner',
        sub: 'GCS · Compute · IAM · SQL',
        col: 1,
        row: 1,
        tone: 'amber',
      },
      { id: 'plan', label: 'Remediation Planner', sub: 'reversible gcloud', col: 2, row: 1, tone: 'amber' },
      { id: 'risk', label: 'Risk Assessor', sub: 'guardrails → rubric 0–10', col: 3, row: 1, tone: 'ember' },
      { id: 'exec', label: 'Change Executor', sub: 'post-state proof', col: 4, row: 1, tone: 'amber' },
      { id: 'gate', label: 'Human gate', sub: 'score ≥ 4', col: 3, row: 0, tone: 'brass' },
      { id: 'evidence', label: 'Evidence pack', sub: 'Firestore', col: 4, row: 2, tone: 'sage' },
      { id: 'gcp', label: 'GCP / mock provider', sub: 'Gemini 2.5 Pro on Vertex AI', col: 1, row: 2 },
    ],
    edges: [
      { from: 'nl', to: 'compile' },
      { from: 'compile', to: 'drift' },
      { from: 'drift', to: 'plan' },
      { from: 'plan', to: 'risk' },
      { from: 'risk', to: 'exec', label: '< 4 auto' },
      { from: 'risk', to: 'gate', label: '≥ 4' },
      { from: 'gate', to: 'exec', dashed: true },
      { from: 'exec', to: 'evidence' },
      { from: 'gcp', to: 'drift', dashed: true },
      { from: 'gcp', to: 'exec', dashed: true },
    ],
  },
  'forecast-engine': {
    title: 'Three forecasting streams',
    source: 'F-C51, F-C53, F-C54',
    cols: 4,
    rows: 3,
    nodes: [
      { id: 'weather', label: '3+ weather APIs', sub: 'hourly tensor', col: 0, row: 0, tone: 'teal' },
      { id: 'meters', label: 'Smart-meter telemetry', sub: 'Kinesis → S3', col: 0, row: 1, tone: 'teal' },
      { id: 'farm', label: 'Crop · soil · weather', sub: '+ receipt OCR', col: 0, row: 2, tone: 'teal' },
      { id: 'mm', label: 'Multi-modal LSTM', sub: 'encoders per modality', col: 1, row: 0, tone: 'amber' },
      {
        id: 'pt',
        label: 'Per-transformer LSTM',
        sub: 'SageMaker · shared embeddings',
        col: 1,
        row: 1,
        tone: 'amber',
      },
      { id: 'hy', label: 'Regression + rules', sub: 'not an LSTM', col: 1, row: 2, tone: 'brass' },
      { id: 'cv', label: 'Rolling-window CV', sub: 'held-out districts', col: 2, row: 0 },
      { id: 'store', label: 'Low-latency read store', col: 2, row: 1 },
      { id: 'heat', label: 'District risk heatmaps', sub: '+15% (résumé)', col: 3, row: 0, tone: 'sage' },
      { id: 'ops', label: 'Ops dashboard', sub: '+25% resilience (résumé)', col: 3, row: 1, tone: 'sage' },
      { id: 'mobile', label: 'Mobile dashboard', sub: '+35% / −50% (résumé)', col: 3, row: 2, tone: 'sage' },
    ],
    edges: [
      { from: 'weather', to: 'mm' },
      { from: 'mm', to: 'cv' },
      { from: 'cv', to: 'heat' },
      { from: 'meters', to: 'pt' },
      { from: 'pt', to: 'store' },
      { from: 'store', to: 'ops' },
      { from: 'farm', to: 'hy' },
      { from: 'hy', to: 'mobile' },
    ],
  },
  'data-workbench': {
    title: 'One bench, three ELK pipelines',
    source: 'F-C61, F-C63, F-C65',
    cols: 4,
    rows: 3,
    nodes: [
      { id: 'dom', label: 'DOM snapshots', col: 0, row: 0, tone: 'teal' },
      { id: 'tickets', label: 'Incident-ticket dumps', col: 0, row: 1, tone: 'teal' },
      { id: 'assets', label: 'Asset records', col: 0, row: 2, tone: 'teal' },
      {
        id: 'cluster',
        label: 'n-gram cosine clustering',
        sub: 'frequency × impact × tickets',
        col: 1,
        row: 0,
        tone: 'amber',
      },
      { id: 'clean', label: 'pandas cleaner', sub: 'deterministic doc IDs', col: 1, row: 1, tone: 'amber' },
      { id: 'np', label: 'pandas / NumPy', col: 1, row: 2, tone: 'amber' },
      { id: 'es', label: 'Elasticsearch', sub: 'bulk index', col: 2, row: 1, tone: 'brass' },
      { id: 'kib', label: 'Kibana', sub: 'heatmaps · trends', col: 3, row: 1, tone: 'sage' },
      { id: 'jup', label: 'Jupyter', sub: 'product review', col: 3, row: 0, tone: 'sage' },
    ],
    edges: [
      { from: 'dom', to: 'cluster' },
      { from: 'cluster', to: 'es' },
      { from: 'cluster', to: 'jup', dashed: true },
      { from: 'tickets', to: 'clean' },
      { from: 'clean', to: 'es' },
      { from: 'assets', to: 'np' },
      { from: 'np', to: 'es' },
      { from: 'es', to: 'kib' },
    ],
  },
  'calibration-bench': {
    title: 'Ten instruments by issuer',
    source: 'F-E01–F-E10',
    cols: 3,
    rows: 2,
    nodes: [
      { id: 'aws', label: 'AWS', sub: 'SAA-C03 · CLF-C02', col: 0, row: 0, tone: 'amber' },
      {
        id: 'ms',
        label: 'Microsoft',
        sub: 'AI-102 · AZ-104 · AZ-900 · GH-300 · Excellerate',
        col: 1,
        row: 0,
        tone: 'teal',
      },
      { id: 'fz', label: 'Founderz', sub: 'Master · Commander · Explorer', col: 2, row: 0, tone: 'brass' },
      { id: 'verify', label: 'Verify links', sub: 'credential IDs', col: 1, row: 1, tone: 'sage' },
    ],
    edges: [
      { from: 'aws', to: 'verify' },
      { from: 'ms', to: 'verify' },
      { from: 'fz', to: 'verify' },
    ],
  },
  'foundations-generator': {
    title: 'The hall’s power source',
    source: 'F-F01–F-F03, F-B10–F-B11',
    cols: 3,
    rows: 2,
    nodes: [
      {
        id: 'school',
        label: 'L.P. Savani International School',
        sub: 'Surat · 10th & 12th CBSE',
        col: 0,
        row: 0,
      },
      {
        id: 'vit',
        label: 'Vellore Institute of Technology',
        sub: 'B.Tech CSE 2021–2025',
        col: 1,
        row: 0,
        tone: 'amber',
      },
      { id: 'gdsc', label: 'GDSC VIT', sub: 'Technical Core Member', col: 1, row: 1, tone: 'brass' },
      {
        id: 'students',
        label: '500+ students',
        sub: '2 hackathons · 4 challenges (résumé)',
        col: 2,
        row: 1,
        tone: 'sage',
      },
      { id: 'hall', label: 'The hall', sub: 'Kyndryl · Jul 2025 →', col: 2, row: 0, tone: 'teal' },
    ],
    edges: [
      { from: 'school', to: 'vit' },
      { from: 'vit', to: 'gdsc' },
      { from: 'gdsc', to: 'students' },
      { from: 'vit', to: 'hall' },
    ],
  },
};
