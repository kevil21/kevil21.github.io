import { parseTool, projectFilter, sections } from './index';
import type { Tool } from './index';
import type { Corpus } from '../corpus';
import { parseRequest } from '../../scripts/contracts';
import { retrieve } from '../retrieval';

export function destination(tool: Tool, corpus: Corpus): string {
  switch (tool.name) {
    case 'navigateTo': return sections[tool.section];
    case 'openProject': return `/projects/${tool.projectId}/`;
    case 'filterProjects': return `/?projects=${projectFilter(tool.criteria, corpus).join(',')}#projects-heading`;
    case 'highlightSkill': return `/evidence/#${tool.skillId}`;
    case 'openResume': return '/resume/';
    case 'showEvidence': return `/evidence/#${tool.evidenceId}`;
    case 'showRelevantExperience': {
      const ids = retrieve(tool.criteria, corpus);
      const experience = corpus.experience.find((e) => e.evidenceIds.some((id) => ids.includes(id)));
      return `/experience/#${experience?.id ?? 'experience'}`;
    }
    case 'compareProjects': return `/compare/?left=${tool.projectIds[0]}&right=${tool.projectIds[1]}`;
    case 'openArchitectureNode': return `/architecture/#${tool.nodeId}`;
    case 'resetWorkspace': case 'switchPersona': return '/';
  }
}
/** Input is revalidated at execution, not only at model parsing. No untrusted URL/selector/HTML. */
export function executeTool(value: unknown, corpus: Corpus): boolean {
  const tool = parseTool(value, corpus); if (!tool) return false;
  const dispatch = (detail: unknown) => {
    const parsed = parseRequest(detail, corpus.projects.map((p) => p.id));
    if (parsed) document.dispatchEvent(new CustomEvent('atlas:request', { detail: parsed }));
  };
  if (tool.name === 'switchPersona') dispatch({ type: 'set-persona', persona: tool.persona });
  else if (tool.name === 'openProject' && document.querySelector('#project-map[data-atlas-ready="true"]')) dispatch({ type: 'select-project', projectId: tool.projectId });
  else if (tool.name === 'filterProjects' && document.querySelector('#project-map[data-atlas-ready="true"]')) dispatch({ type: 'filter-projects', projectIds: projectFilter(tool.criteria, corpus) });
  else if (tool.name === 'compareProjects' && location.pathname === '/compare/') dispatch({ type: 'compare-projects', left: tool.projectIds[0], right: tool.projectIds[1] });
  else if (tool.name === 'resetWorkspace') {
    dispatch({ type: 'set-persona', persona: 'recruiter' }); dispatch({ type: 'filter-domain', domain: 'all' }); dispatch({ type: 'set-view', view: 'map' }); dispatch({ type: 'select-project', projectId: 'a360' });
    if (location.pathname !== '/') location.assign('/');
  } else location.assign(destination(tool, corpus));
  return true;
}