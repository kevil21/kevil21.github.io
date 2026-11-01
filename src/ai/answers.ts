/**
 * Scripted, sourced answers for common intents (the deterministic path the router falls back to when no model is
 * loaded or the model returns no prose). Each answer is assembled from chunks, so its citations are real.
 */
import type { Chunk } from './protocol';
import type { ContentBundle } from './chunks';

export interface ScriptedAnswer {
  intent: string;
  patterns: string[]; // lowercase substrings / keywords
  text: string; // with [n] citations referring to `cites` order
  cites: string[]; // chunk ids
  tools?: Array<{ name: string; args: Record<string, unknown>; preview: string }>;
}

function byId(chunks: Chunk[], id: string): Chunk | undefined {
  return chunks.find((c) => c.id === id);
}

export function buildAnswers(bundle: ContentBundle, chunks: Chunk[]): ScriptedAnswer[] {
  const out: ScriptedAnswer[] = [];
  const has = (id: string) => Boolean(byId(chunks, id));

  if (has('profile:title')) {
    out.push({
      intent: 'who',
      patterns: [
        'who is kevil',
        'who are you',
        'about kevil',
        'introduce',
        'what do you do',
        'tell me about yourself',
        'summary',
      ],
      text: `${byId(chunks, 'profile:title')!.text} [1] ${byId(chunks, 'profile:lead-0')?.text ?? ''} [2]`,
      cites: ['profile:title', 'profile:lead-0'],
      tools: [{ name: 'openResume', args: {}, preview: 'Open the résumé' }],
    });
  }
  if (has('project:a360:summary')) {
    out.push({
      intent: 'a360',
      patterns: ['a360', 'observability platform', 'agent observability', 'telemetry refinery', 'refinery'],
      text: `${byId(chunks, 'project:a360:summary')!.text} [1] ${byId(chunks, 'exp:kyndryl:bullet-1')?.text ?? ''} [2] The sync service re-runs safely: ${byId(chunks, 'decision:D-A360-SYNC-OVERLAP')?.text.split(' — ')[0] ?? ''} [3]`,
      cites: ['project:a360:summary', 'exp:kyndryl:bullet-1', 'decision:D-A360-SYNC-OVERLAP'],
      tools: [
        {
          name: 'walkTo',
          args: { machine: 'telemetry-refinery' },
          preview: 'Walk to the Telemetry Refinery',
        },
        { name: 'openCaseStudy', args: { id: 'a360' }, preview: 'Open the A360 case study' },
      ],
    });
  }
  if (has('project:p2p:summary')) {
    out.push({
      intent: 'p2p',
      patterns: [
        'p2p',
        'policy to pipelines',
        'policy → pipelines',
        'policy sorter',
        'langgraph',
        'governance',
        'guardrail',
        'drift',
      ],
      text: `${byId(chunks, 'project:p2p:summary')!.text} [1] ${byId(chunks, 'decision:D-P2P-GUARDRAILS-FIRST')?.text.split(' — ')[0] ?? ''} [2] ${byId(chunks, 'project:p2p:outcome-0')?.text ?? ''} [3]`,
      cites: ['project:p2p:summary', 'decision:D-P2P-GUARDRAILS-FIRST', 'project:p2p:outcome-0'],
      tools: [
        { name: 'walkTo', args: { machine: 'policy-sorter' }, preview: 'Walk to the Policy Sorter' },
        { name: 'openCaseStudy', args: { id: 'p2p' }, preview: 'Open the P2P case study' },
      ],
    });
  }
  if (has('project:smart-energy:summary')) {
    out.push({
      intent: 'forecasting',
      patterns: [
        'lstm',
        'forecast',
        'time series',
        'time-series',
        'climate',
        'smart energy',
        'energy',
        'opticrop',
        'irrigation',
        'migration',
      ],
      text: `${byId(chunks, 'project:climate-mitigation:summary')?.text ?? ''} [1] ${byId(chunks, 'project:smart-energy:summary')?.text ?? ''} [2] ${byId(chunks, 'project:opticrop:summary')?.text ?? ''} [3]`,
      cites: [
        'project:climate-mitigation:summary',
        'project:smart-energy:summary',
        'project:opticrop:summary',
      ],
      tools: [
        { name: 'walkTo', args: { machine: 'forecast-engine' }, preview: 'Walk to the Forecast Engine' },
      ],
    });
  }
  if (has('project:overlay-insights:summary')) {
    out.push({
      intent: 'elk',
      patterns: [
        'elk',
        'elasticsearch project',
        'kibana',
        'overlay',
        'incident ticket',
        'it asset',
        'data workbench',
        'workbench',
      ],
      text: `${byId(chunks, 'project:overlay-insights:summary')?.text ?? ''} [1] ${byId(chunks, 'project:incident-tickets:summary')?.text ?? ''} [2] ${byId(chunks, 'project:it-assets:summary')?.text ?? ''} [3]`,
      cites: [
        'project:overlay-insights:summary',
        'project:incident-tickets:summary',
        'project:it-assets:summary',
      ],
      tools: [{ name: 'walkTo', args: { machine: 'data-workbench' }, preview: 'Walk to the Data Workbench' }],
    });
  }
  const certIds = chunks.filter((c) => c.id.startsWith('cert:')).map((c) => c.id);
  if (certIds.length) {
    out.push({
      intent: 'certifications',
      patterns: ['certif', 'credential', 'aws certified', 'azure certified', 'founderz', 'calibration'],
      text: `Kevil holds ten certifications across AWS, Microsoft and Founderz; issue months come from info.md and expiry dates from the credentials. ${certIds
        .slice(0, 10)
        .map((id, i) => `${byId(chunks, id)!.text.split(' — ')[0]} [${i + 1}]`)
        .join(' ')}`,
      cites: certIds.slice(0, 10),
      tools: [
        { name: 'walkTo', args: { machine: 'calibration-bench' }, preview: 'Walk to the Calibration Bench' },
      ],
    });
  }
  if (has('edu:vit')) {
    out.push({
      intent: 'education',
      patterns: [
        'education',
        'university',
        'college',
        'vit',
        'vellore',
        'degree',
        'cgpa',
        'school',
        'gdsc',
        'foundations',
      ],
      text: `${byId(chunks, 'edu:vit')!.text} [1] ${byId(chunks, 'exp:gdsc:bullet-0')?.text ?? ''} [2]`,
      cites: ['edu:vit', 'exp:gdsc:bullet-0'],
      tools: [
        {
          name: 'walkTo',
          args: { machine: 'foundations-generator' },
          preview: 'Walk to the Foundations Generator',
        },
      ],
    });
  }
  if (has('profile:email')) {
    out.push({
      intent: 'contact',
      patterns: ['contact', 'email', 'reach', 'hire', 'hiring', 'available', 'linkedin', 'github'],
      text: `${byId(chunks, 'profile:email')!.text} [1] ${byId(chunks, 'profile:open-to')?.text ?? ''} [2]`,
      cites: ['profile:email', 'profile:open-to'],
    });
  }
  const skillIds = chunks.filter((c) => c.id.startsWith('skills:')).map((c) => c.id);
  if (skillIds.length) {
    out.push({
      intent: 'skills',
      patterns: ['skills', 'stack', 'technologies', 'languages', 'tools', 'what can you', 'proficien'],
      text: skillIds.map((id, i) => `${byId(chunks, id)!.text} [${i + 1}]`).join(' '),
      cites: skillIds,
    });
  }
  if (has('exp:kyndryl:role')) {
    out.push({
      intent: 'experience',
      patterns: ['experience', 'kyndryl', 'work history', 'job', 'role', 'intern', 'charly'],
      text: `${byId(chunks, 'exp:kyndryl:role')!.text} [1] ${byId(chunks, 'exp:kyndryl:bullet-0')?.text ?? ''} [2] ${byId(chunks, 'exp:charly:role')?.text ?? ''} [3]`,
      cites: ['exp:kyndryl:role', 'exp:kyndryl:bullet-0', 'exp:charly:role'],
      tools: [{ name: 'openResume', args: {}, preview: 'Open the résumé' }],
    });
  }
  out.push({
    intent: 'tour',
    patterns: ['tour', 'show me around', 'walk me', 'guide'],
    text: 'The guided tour visits every machine once in about ninety seconds. Press the button to start it.',
    cites: [],
    tools: [{ name: 'startTour', args: {}, preview: 'Start the 90-second tour' }],
  });
  out.push({
    intent: 'secrets',
    patterns: ['secret', 'easter egg', 'hidden', 'night shift', 'lab notebook'],
    text: 'The lab notebook lists every hidden switch on the floor. Nothing in it is invented; every egg is reachable by keyboard and touch.',
    cites: [],
    tools: [{ name: 'showEvidence', args: { nodeId: 'lab-notebook' }, preview: 'Open the lab notebook' }],
  });
  return out;
}
