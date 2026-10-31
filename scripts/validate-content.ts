import { loadContentFromDisk } from './lib/load-content';
import { validateKnowledge } from '../src/lib/knowledge/validate';

const data = loadContentFromDisk();
const problems = validateKnowledge(data);
if (problems.length) {
  console.error(`✗ content validation failed (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.info(
  `✓ content valid: ${data.experience.length} roles, ${data.projects.length} projects, ${data.skills.length} skills, ${data.technologies.length} technologies, ${data.certifications.length} certifications, ${data.education.length} education, ${data.decisions.length} decisions, ${data.evidence.length} evidence, ${data.journeys.length} journeys`,
);
