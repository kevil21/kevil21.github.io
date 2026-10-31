/** Every internal URL is produced here so no page can drift from the canonical structure. */
export const routes = {
  home: () => '/',
  project: (id: string) => `/work/${id}/`,
  role: (id: string) => `/roles/${id}/`,
  skill: (id: string) => `/skills/${id}/`,
  skills: () => '/skills/',
  technology: (skillId: string, techId: string) => `/skills/${skillId}/#tech-${techId}`,
  credentials: () => '/credentials/',
  credential: (id: string) => `/credentials/#${id}`,
  education: () => '/education/',
  educationEntry: (id: string) => `/education/#${id}`,
  decision: (projectId: string, decisionId: string) => `/work/${projectId}/#decision-${decisionId}`,
  resume: () => '/resume/',
  match: () => '/match/',
  ask: () => '/ask/',
  journeys: () => '/journeys/',
  journey: (persona: string) => `/journeys/${persona}/`,
  observatory: () => '/observatory/',
  compare: () => '/compare/',
  offline: () => '/offline/',
} as const;

export const SITE = 'https://kevilpatel.in';
export const absolute = (path: string) => new URL(path, SITE).toString();
