// Lighthouse CI — both presets (prompt §9). Run `LH_PRESET=mobile npm run lighthouse` or `LH_PRESET=desktop ...`.
const preset = process.env.LH_PRESET === 'mobile' ? 'mobile' : 'desktop';

const urls = ['/', '/machines/telemetry-refinery/', '/work/a360/', '/resume/'];

/** @type {import('@lhci/cli').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: urls.map((u) => `http://localhost${u}`),
      numberOfRuns: 2,
      settings:
        preset === 'mobile'
          ? { formFactor: 'mobile', screenEmulation: { mobile: true } }
          : { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: { target: 'filesystem', outputDir: `.lighthouseci/${preset}` },
  },
};
