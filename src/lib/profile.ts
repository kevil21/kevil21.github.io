/**
 * The recruiter-strip facts. Every value traces to the fact ledger (Memory/SIMULATION-ROOM/fact-ledger.md).
 * Title and headline follow Kevil's interview answer resolving conflicts C-01 and C-02 (2026-11-01).
 */
export const PROFILE = {
  name: 'Kevil Patel', // F-A01 · KPOS/site/index.html#L38
  title: 'Associate Software Development Engineer', // F-A03 · KPOS/site/index.html#L40, Kevil_Resume_2026.md#L3
  titleShort: 'Associate SDE', // F-A03 short form · KPOS/site/index.html#L483
  employer: 'Kyndryl', // F-A04 · KPOS/site/index.html#L41
  employerUrl: 'https://www.kyndryl.com', // F-A04
  headline: 'building agentic AI on cloud', // F-A18, C-02 resolution
  location: 'Surat, Gujarat · Bangalore, India', // F-A05, C-16
  email: 'kevilpatel24@gmail.com', // F-A06 · KPOS/site/index.html#L43
  links: {
    linkedin: 'https://linkedin.com/in/kevil21', // F-A08
    github: 'https://github.com/kevil21', // F-A09
    huggingface: 'https://huggingface.co/Kevil21', // F-A10
    msLearn: 'https://learn.microsoft.com/en-in/users/kevil21/', // F-A11
    credly: 'https://www.credly.com/users/kevil-patel.db5e53fa', // F-A12
    googleSkills: 'https://www.skills.google/public_profiles/368f1807-b155-48d9-ba6c-e9ba98a384f5', // F-A13
  },
} as const;
