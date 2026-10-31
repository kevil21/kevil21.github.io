import rawPortfolio from '../../content/portfolio.json' with { type: 'json' };
import { portfolioSchema } from './schema.ts';

/** The sole public content entry point. Invalid content fails the build. */
export const portfolio = portfolioSchema.parse(rawPortfolio);
export type { Portfolio, Profile, Project, Experience, Skill, Certification, Education, Achievement, Evidence, Journey, Decision, Domain, Persona } from './schema.ts';