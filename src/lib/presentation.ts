import { portfolio } from './content';
import type { Project } from './content';

export const evidenceFor = (ids: string[]) => portfolio.evidence.filter((item) => ids.includes(item.id));
export const skillsFor = (project: Project) => portfolio.skills.filter((skill) =>
  portfolio.evidence.some((item) => item.projectIds.includes(project.id) && item.skillIds.includes(skill.id)));
export const jsonForHtml = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');