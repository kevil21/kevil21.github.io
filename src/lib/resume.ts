import type { Portfolio } from './schema.ts';

const escape = (value: string): string => value.replace(/[\\`*_{}[\]<>#!|]/g, '\\$&');
const link = (label: string, url: string): string => `[${escape(label)}](<${url}>)`;

/** Only canonical content enters the download; never copy the original résumé. */
export function renderResume(data: Portfolio): string {
  const lines = [
    `# ${escape(data.resume.title)}`, '',
    `**${escape(data.profile.role)}**`, '',
    `${escape(data.profile.location)} · ${link(data.profile.email, `mailto:${data.profile.email}`)}`, '',
    data.profile.links.map((item) => link(item.label, item.url)).join(' · '), '',
    escape(data.profile.summary), '', escape(data.resume.summary), '', '## Experience', '',
  ];
  for (const item of data.experience) lines.push(`### ${escape(item.title)} — ${escape(item.organization)}`, '', escape(item.period), '', escape(item.summary), '');
  lines.push('## Projects', '');
  for (const item of data.projects) lines.push(`### ${item.url ? link(item.title, item.url) : escape(item.title)}`, '', escape(item.subtitle), '', escape(item.summary), '', `**Technologies:** ${item.technologies.map(escape).join(' · ')}`, '');
  lines.push('## Skills', '');
  for (const category of [...new Set(data.skills.map((skill) => skill.category))]) lines.push(`**${escape(category)}:** ${data.skills.filter((skill) => skill.category === category).map((skill) => escape(skill.name)).join(' · ')}`, '');
  lines.push('## Certifications', '');
  for (const item of data.certifications) lines.push(`### ${escape(item.title)} — ${escape(item.issuer)}`, '', ...(item.credentialId ? [`Credential ID: ${escape(item.credentialId)}`, ''] : []), link('Source-provided issuer link', item.url), '', escape(item.verificationNote), '');
  lines.push('## Education', '');
  for (const item of data.education) lines.push(`### ${escape(item.title)} — ${escape(item.institution)}`, '', escape(item.period), '', escape(item.detail), '');
  lines.push('## Achievements', '');
  for (const item of data.achievements) lines.push(`- **${escape(item.title)}:** ${escape(item.summary)}`);
  lines.push('', '## Languages', '', data.profile.languages.map(escape).join(' · '), '');
  return lines.join('\n');
}