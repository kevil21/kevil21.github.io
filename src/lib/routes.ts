/** Browser-safe routes. Unknown kinds never become arbitrary destinations. */
export function documentHref(kind: string, id: string): string {
  const anchor = encodeURIComponent(id);
  switch (kind) {
    case 'project': return `/projects/${anchor}/`;
    case 'evidence': return `/evidence/#${anchor}`;
    case 'skill': return `/evidence/#${anchor}`;
    case 'certification': return `/credentials/#${anchor}`;
    case 'experience': case 'education': case 'achievement': return `/experience/#${anchor}`;
    case 'journey': return `/#${anchor}`;
    case 'decision': return `/architecture/#${anchor}`;
    case 'resume': return '/resume/';
    case 'profile': return '/experience/#profile';
    default: return '/search/';
  }
}

export const domains = ['observability', 'governance', 'intelligence', 'craft'] as const;
export const personas = ['recruiter', 'engineer', 'architect'] as const;
export const domainNotes: Record<typeof domains[number], string> = {
  observability: 'From signals to understanding.',
  governance: 'From policy to accountable action.',
  intelligence: 'Forecasting in the physical world.',
  craft: 'Knowledge worth sharing.',
};