/**
 * Pre-generated answers. These are TEMPLATED from the content model — no language model is involved,
 * so nothing here can be invented. Each answer lists the chunk ids that evidence it.
 */
import type { AnswerEntry, Chunk } from '../../src/ai/protocol';
import type { KnowledgeData } from '../../src/lib/schema';
import { formatYM } from '../../src/lib/knowledge/dates';

export function buildAnswers(data: KnowledgeData, chunks: Chunk[]): AnswerEntry[] {
  const byNode = (id: string, kind?: Chunk['kind']) =>
    chunks.filter((c) => c.nodeId === id && (!kind || c.kind === kind)).map((c) => c.id);
  const p = data.profile;
  const kyndryl = data.experience.find((x) => x.org === 'Kyndryl');
  const flagship = data.projects.filter((x) => x.kind === 'flagship');
  const cloudCerts = data.certifications.filter((c) => c.issuerId === 'aws' || c.code?.startsWith('AZ'));
  const aiCerts = data.certifications.filter((c) => c.skills.includes('agentic-ai') || c.code === 'AI-102');
  const list = (xs: string[]) =>
    xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

  const answers: AnswerEntry[] = [
    {
      id: 'who',
      question: 'Who is Kevil Patel?',
      patterns: [
        'who is kevil',
        'about kevil',
        'tell me about yourself',
        'introduce yourself',
        'your background',
        'quick summary',
      ],
      answer: `${p.name} is ${p.title} at Kyndryl (Agentic AI practice), based in ${list(p.locations.map((l) => l.city))}, India. ${p.about[0]?.text ?? ''}`,
      evidence: [...byNode('profile'), ...(kyndryl ? byNode(kyndryl.id, 'summary') : [])],
    },
    {
      id: 'current-role',
      question: 'What does Kevil do at Kyndryl?',
      patterns: [
        'current role',
        'what do you do',
        'at kyndryl',
        'current job',
        'work now',
        'currently doing',
        'role at kyndryl',
      ],
      answer: kyndryl
        ? `${kyndryl.role} at ${kyndryl.org} since ${formatYM(kyndryl.start)}. ${kyndryl.highlights.map((h) => h.text).join(' ')}`
        : 'No current role is recorded.',
      evidence: kyndryl ? byNode(kyndryl.id) : [],
      tools: kyndryl ? [{ tool: 'showEvidence', args: { nodeId: kyndryl.id } }] : [],
    },
    {
      id: 'strongest-projects',
      question: "What are Kevil's strongest cloud and AI projects?",
      patterns: [
        'strongest projects',
        'best projects',
        'flagship',
        'cloud and ai projects',
        'top projects',
        'main projects',
        'show me projects',
      ],
      answer: `The flagship projects are ${list(flagship.map((f) => f.name))}. ${flagship.map((f) => `${f.shortName ?? f.name}: ${f.tagline}`).join(' ')}`,
      evidence: flagship.flatMap((f) => byNode(f.id, 'summary')),
      tools: [{ tool: 'filterProjects', args: { kinds: ['flagship'] } }],
    },
    {
      id: 'certifications',
      question: 'Which certifications does Kevil hold?',
      patterns: ['certifications', 'certified', 'credentials', 'certs', 'badges'],
      answer: `${data.certifications.length} certifications: ${list(data.certifications.map((c) => (c.code ? `${c.name} (${c.code})` : `${c.name} by ${c.issuer}`)))}. Each has a credential ID and a verification link on the credentials page.`,
      evidence: data.certifications.flatMap((c) => byNode(c.id)),
      tools: [{ tool: 'navigateTo', args: { section: 'credentials' } }],
    },
    {
      id: 'cloud-certs',
      question: 'Is Kevil certified on AWS or Azure?',
      patterns: [
        'aws certified',
        'azure certified',
        'cloud certifications',
        'solutions architect',
        'az-104',
        'saa',
      ],
      answer: `Yes — ${list(cloudCerts.map((c) => `${c.name}${c.code ? ` (${c.code})` : ''}`))}.`,
      evidence: cloudCerts.flatMap((c) => byNode(c.id)),
      tools: [{ tool: 'navigateTo', args: { section: 'credentials' } }],
    },
    {
      id: 'ai-certs',
      question: 'What AI certifications does Kevil have?',
      patterns: ['ai certifications', 'agentic certifications', 'ai-102', 'founderz'],
      answer: `${list(aiCerts.map((c) => `${c.name}${c.code ? ` (${c.code})` : ''} by ${c.issuer}`))}.`,
      evidence: aiCerts.flatMap((c) => byNode(c.id)),
    },
    {
      id: 'education',
      question: 'Where did Kevil study?',
      patterns: ['education', 'university', 'college', 'degree', 'cgpa', 'vit', 'study'],
      answer: data.education
        .map(
          (e) =>
            `${e.degree} at ${e.institution} (${formatYM(e.start)} → ${formatYM(e.end)}), ${e.grade.label} ${e.grade.value}.${e.highlights.length ? ' ' + e.highlights.map((h) => h.text).join(' ') : ''}`,
        )
        .join(' '),
      evidence: data.education.flatMap((e) => byNode(e.id)),
      tools: [{ tool: 'navigateTo', args: { section: 'education' } }],
    },
    {
      id: 'skills',
      question: 'What are Kevil’s main skills?',
      patterns: [
        'main skills',
        'tech stack',
        'technologies',
        'what can you do',
        'areas of expertise',
        'programming languages',
        'list skills',
      ],
      answer:
        ['languages', 'ai', 'cloud', 'dev', 'data']
          .map(
            (cat) =>
              `${cat}: ${data.skills
                .filter((s) => s.category === cat)
                .map((s) => s.name)
                .join(', ')}`,
          )
          .join('. ') + '.',
      evidence: data.skills.slice(0, 12).flatMap((s) => byNode(s.id)),
      tools: [{ tool: 'navigateTo', args: { section: 'skills' } }],
    },
    {
      id: 'contact',
      question: 'How can I contact Kevil?',
      patterns: [
        'contact kevil',
        'email address',
        'how to reach',
        'hire kevil',
        'get in touch',
        'linkedin profile',
        'contact details',
      ],
      answer:
        `Email ${p.email}. Profiles: ${p.links.map((l) => `${l.label} (${l.url})`).join(', ')}. ${p.availability?.text ?? ''}`.trim(),
      evidence: byNode('profile', 'fact'),
    },
    {
      id: 'experience-timeline',
      question: 'What is Kevil’s work experience?',
      patterns: [
        'work experience',
        'work history',
        'timeline',
        'career so far',
        'previous roles',
        'internship',
        'employment history',
      ],
      answer:
        data.experience
          .map((x) => `${x.role} at ${x.org} (${formatYM(x.start)} → ${formatYM(x.end)})`)
          .join('; ') + '.',
      evidence: data.experience.flatMap((x) => byNode(x.id, 'summary')),
      tools: [{ tool: 'navigateTo', args: { section: 'trace' } }],
    },
    {
      id: 'resume',
      question: 'Can I see the résumé?',
      patterns: ['resume', 'résumé', 'cv', 'download pdf', 'print resume'],
      answer:
        'The résumé page is a complete, printable version of this portfolio; use Print → Save as PDF for a copy.',
      evidence: byNode('profile', 'fact'),
      tools: [{ tool: 'openResume', args: {} }],
    },
    {
      id: 'observability',
      question: 'What has Kevil built in observability?',
      patterns: [
        'observability',
        'telemetry',
        'opentelemetry',
        'monitoring',
        'dashboards',
        'elk',
        'elasticsearch',
      ],
      answer: `Observability is the thread through most of the work: A360 (OpenTelemetry → ADX → Elasticsearch → Next.js) at Kyndryl, and the ELK-based open-source toolkits ${list(data.projects.filter((x) => x.stack.includes('elasticsearch') && x.kind === 'open-source').map((x) => x.name))}.`,
      evidence: [...byNode('observability'), ...byNode('a360', 'summary')],
      tools: [{ tool: 'highlightSkill', args: { skillId: 'observability' } }],
    },
    {
      id: 'agentic',
      question: 'What agentic AI work has Kevil done?',
      patterns: ['agentic', 'agents', 'langgraph', 'multi-agent', 'llm', 'generative ai', 'ai foundry'],
      answer: `Agentic AI at Kyndryl: enterprise POCs on Azure AI Foundry, A360 (observability for agent fleets, including an Agent Trust Score) and Policy → Pipelines, a 5-agent LangGraph governance platform. Certifications include ${list(aiCerts.map((c) => c.name))}.`,
      evidence: [
        ...byNode('agentic-ai'),
        ...byNode('policy-to-pipelines', 'summary'),
        ...byNode('a360', 'summary'),
      ],
      tools: [{ tool: 'highlightSkill', args: { skillId: 'agentic-ai' } }],
    },
    {
      id: 'not-demonstrated',
      question: 'Does Kevil have experience with X?',
      patterns: [],
      answer:
        'The portfolio does not demonstrate that. Only skills, projects and credentials recorded in the source material are shown here; nothing is inferred.',
      evidence: [],
    },
  ];
  return answers;
}
