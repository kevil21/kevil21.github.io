/** Shared server-side helpers for pages: knowledge, graph, trace, labels, JSON-LD. */
import { loadKnowledge } from './knowledge/load';
import { buildGraph } from './knowledge/graph';
import { buildTrace } from './knowledge/spans';
import { buildSignalSeries } from './knowledge/signal';
import { absolute, routes } from './knowledge/routes';
import type { KnowledgeData } from './schema';

export async function pageData() {
  const data = await loadKnowledge();
  const graph = buildGraph(data);
  const trace = buildTrace(data);
  const signal = buildSignalSeries(trace);
  const labels: Record<string, string> = {};
  for (const n of graph.nodes.values()) labels[n.id] = n.title;
  for (const t of data.technologies) labels[t.id] = t.name;
  for (const s of data.skills) labels[s.id] = s.name;
  return { data, graph, trace, signal, labels };
}

export function personJsonLd(data: KnowledgeData) {
  const p = data.profile;
  const kyndryl = data.experience.find((x) => x.org === 'Kyndryl');
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    alternateName: p.fullName,
    jobTitle: p.title,
    url: absolute(routes.home()),
    email: `mailto:${p.email}`,
    image: absolute('/images/derived/headshot-640.jpg'),
    sameAs: p.links.map((l) => l.url),
    address: p.locations.map((l) => ({
      '@type': 'PostalAddress',
      addressLocality: l.city,
      addressRegion: l.region,
      addressCountry: 'IN',
    })),
    worksFor: kyndryl ? { '@type': 'Organization', name: kyndryl.org, url: kyndryl.orgUrl } : undefined,
    alumniOf: data.education.map((e) => ({
      '@type': 'EducationalOrganization',
      name: e.institution,
      url: e.url,
    })),
    hasCredential: data.certifications.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name,
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
      url: c.verifyUrl,
    })),
    knowsAbout: data.skills.map((s) => s.name),
    knowsLanguage: p.languages.map((l) => l.name),
  };
}
